(function () {

    async function GraphQL(path, query) {
        const req = new Request(path);
        req.headers = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        };
        req.method = 'POST';
        req.body = JSON.stringify({
            query,
        });
        let res = '';
        try {
            res = await req.loadString();
            return JSON.parse(res);
        }
        catch (err) {
            throw `Failed to parse JSON.\n` +
                `- URL: ${req.url}\n` +
                `- Body:\n${res}`;
        }
    }

    // Based on https://github.com/au5ton/scriptable.app/blob/75cdb02e1229fc4c4338169657e4f782f9a935bf/PlexStreamsWidget.js
    const widgetModule = {
        createWidget: async (params) => {
            // extract user data
            const positionID = parseWidgetParameter(params.widgetParameter);
            // get interesting data
            await calculateUniswapPositionData(positionID);
            let w = new ListWidget();
            //w.backgroundColor = uniBackground;
            w.addText("Hello");
            return w;
        }
    };
    const parseWidgetParameter = (param) => {
        return param;
    };
    async function getETHPriceForTimestamp(timestamp) {
        const res = await GraphQL('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', `{
    tokenHourDatas(first: 1,  where: { periodStartUnix_lt: ${timestamp}, token: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"}, orderBy: periodStartUnix, orderDirection: desc) {
      periodStartUnix
      token {
        name
        symbol
      }
      priceUSD
    }
  }`);
        return Number(res.data.tokenHourDatas[0].priceUSD);
    }
    async function calculateUniswapPositionData(positionID) {
        const data = await getUniswapPositionData(positionID);
        // calculate ETH price USD
        const ethPriceUSD = Number(data.bundle.ethPriceUSD);
        // calculate liquidity
        const liquidityUSD = (Number(data.position.depositedToken0) * Number(data.position.token0.derivedETH) * ethPriceUSD)
            + (Number(data.position.depositedToken1) * Number(data.position.token1.derivedETH) * ethPriceUSD);
        // calculate unclaimed fees
        // sincere thanks to: 
        // - https://ethereum.stackexchange.com/a/109484
        // - https://github.com/Uniswap/v3-core/blob/fc2107bd5709cdee6742d5164c1eb998566bcb75/contracts/libraries/Position.sol
        // - https://github.com/Uniswap/interface/blob/8784a761d6ac435408f1bf3562e7b24af859608c/src/hooks/useV3PositionFees.ts#L14
        const { unclaimedFeesToken0, unclaimedFeesToken1 } = (() => {
            const { position: { feeGrowthInside0LastX128, feeGrowthInside1LastX128, liquidity, pool: { feeGrowthGlobal0X128, feeGrowthGlobal1X128, }, token0: { decimals: decimals0, }, token1: { decimals: decimals1, }, tickLower: { feeGrowthOutside0X128: feeGrowthOutside0X128_lower, feeGrowthOutside1X128: feeGrowthOutside1X128_lower, }, tickUpper: { feeGrowthOutside0X128: feeGrowthOutside0X128_upper, feeGrowthOutside1X128: feeGrowthOutside1X128_upper, } }, } = data;
            // number of decimals to round to
            const decimalsToRound = 5;
            const diff0 = BigInt(feeGrowthGlobal0X128) - BigInt(feeGrowthOutside0X128_lower) - BigInt(feeGrowthOutside0X128_upper) - BigInt(feeGrowthInside0LastX128);
            const feeToken0X10e5 = (diff0 * BigInt(liquidity)) / (2n ** 128n) / (1n * 10n ** BigInt(Number(decimals0) - decimalsToRound));
            const diff1 = BigInt(feeGrowthGlobal1X128) - BigInt(feeGrowthOutside1X128_lower) - BigInt(feeGrowthOutside1X128_upper) - BigInt(feeGrowthInside1LastX128);
            const feeToken1X10e5 = (diff1 * BigInt(liquidity)) / (2n ** 128n) / (1n * 10n ** BigInt(Number(decimals1) - decimalsToRound));
            const feeToken0 = Number(feeToken0X10e5) / 10 ** decimalsToRound;
            const feeToken1 = Number(feeToken1X10e5) / 10 ** decimalsToRound;
            return {
                unclaimedFeesToken0: feeToken0,
                unclaimedFeesToken1: feeToken1,
            };
        })();
        // calculate unclaimed fees (USD)
        const unclaimedFeesUSD = (Number(unclaimedFeesToken0) * Number(data.position.token0.derivedETH) * ethPriceUSD)
            + (Number(unclaimedFeesToken1) * Number(data.position.token1.derivedETH) * ethPriceUSD);
        // calculate price boundaries
        const { lowerTickPrice, upperTickPrice, currentPrice, currentPriceUnitDescription } = (() => {
            const shouldUseToken1 = Number(data.position.pool.token0Price) < Number(data.position.pool.token1Price);
            if (shouldUseToken1) {
                return {
                    lowerTickPrice: Number(data.position.tickLower.price0),
                    upperTickPrice: Number(data.position.tickUpper.price0),
                    currentPrice: Number(data.position.pool.token1Price),
                    currentPriceUnitDescription: `${data.position.token1.symbol} per ${data.position.token0.symbol}`
                };
            }
            else {
                return {
                    lowerTickPrice: Number(data.position.tickLower.price1),
                    upperTickPrice: Number(data.position.tickUpper.price1),
                    currentPrice: Number(data.position.pool.token0Price),
                    currentPriceUnitDescription: `${data.position.token0.symbol} per ${data.position.token1.symbol}`
                };
            }
        })();
        // calculate if position is closed
        const inRange = currentPrice > lowerTickPrice && currentPrice < upperTickPrice;
        // calculate gas cost to create
        const { timestamp, gasUsed, gasPrice } = data.position.transaction;
        const ethFiatExchangeRateOnCreation = await getETHPriceForTimestamp(timestamp);
        const gasCostToCreateUSD = (Number(gasPrice) * 10e-10 * 10e-10) * Number(gasUsed) * ethFiatExchangeRateOnCreation;
        const createdTimestamp = Number(timestamp);
        // calculate profit
        const profitUSD = unclaimedFeesUSD - gasCostToCreateUSD;
        // calculate average earnings per day
        const daysSinceCreation = (new Date().valueOf() - (createdTimestamp * 1000)) / (1000 * 3600 * 24);
        const averageEarningsPerDayUSD = unclaimedFeesUSD / daysSinceCreation;
        return {
            ethPriceUSD,
            liquidityUSD,
            unclaimedFeesUSD,
            unclaimedFeesToken0,
            unclaimedFeesToken1,
            lowerTickPrice,
            upperTickPrice,
            currentPrice,
            currentPriceUnitDescription,
            inRange,
            createdTimestamp,
            gasCostToCreateUSD,
            profitUSD,
            averageEarningsPerDayUSD,
        };
    }
    async function getUniswapPositionData(positionID) {
        return (await GraphQL('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', `{
    bundle(id: "1" ) {
      ethPriceUSD
    }
    position(id:${positionID}) {
      liquidity
      depositedToken0
      depositedToken1
      feeGrowthInside0LastX128
      feeGrowthInside1LastX128
      transaction {
        timestamp
        gasUsed
        gasPrice
      }
      token0 {
        symbol
        name
        decimals
        derivedETH
      }
      token1 {
        symbol
        name
        decimals
        derivedETH
      }
      pool {
        token0Price
        token1Price
        feeGrowthGlobal0X128
        feeGrowthGlobal1X128
      }
      tickLower {
        price0
        price1
        feeGrowthOutside0X128
        feeGrowthOutside1X128
      }
      tickUpper {
        price0
        price1
        feeGrowthOutside0X128
        feeGrowthOutside1X128
      }
    }
  }`)).data;
    }
    module.exports = widgetModule;

}());
