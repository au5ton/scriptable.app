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
            const { liquidityUSD, profitUSD, currentPrice, currentPriceUnitDescription, createdTimestamp, inRange, lowerTickPrice, upperTickPrice, averageEarningsPerDayUSD } = await calculateUniswapPositionData(positionID);
            const uniBackground = new Color('#191b1f', 1);
            const uniText = new Color('#ffffff', 1);
            const uniPositiveFees = new Color('#27ae60', 1);
            const uniNegativeFees = new Color('#dc3545', 1);
            let w = new ListWidget();
            w.backgroundColor = uniBackground;
            w.useDefaultPadding();
            // Add "liquidity" caption
            let topRow = w.addStack();
            let caption1 = topRow.addText('Liquidity');
            caption1.font = Font.semiboldSystemFont(12);
            caption1.textColor = uniText;
            topRow.addSpacer();
            if (inRange) {
                let symbol = topRow.addImage(SFSymbol.named('circle.fill').image);
                symbol.tintColor = uniPositiveFees;
                symbol.imageSize = new Size(16, 16);
            }
            else {
                let symbol = topRow.addImage(SFSymbol.named('circle.fill').image);
                symbol.tintColor = uniNegativeFees;
                symbol.imageSize = new Size(16, 16);
            }
            // Add liquidity value
            let value1 = w.addText(`$${financialFormat(liquidityUSD)}`);
            value1.font = Font.mediumSystemFont(18);
            value1.minimumScaleFactor = 0.5;
            value1.textColor = uniText;
            w.addSpacer();
            // // Add "unclaimed fees" caption
            // let caption2 = w.addText('Unclaimed fees');
            // caption2.font = Font.semiboldSystemFont(12);
            // caption2.textColor = uniText;
            // // Add unclaimed fees value
            // let value2 = w.addText(`$${financialFormat(unclaimedFeesUSD)}`);
            // value2.font = Font.mediumSystemFont(22);
            // value2.minimumScaleFactor = 0.5;
            // value2.textColor = uniPositiveFees;
            // Add "Profit" caption
            let caption2 = w.addText('Net Earnings');
            caption2.font = Font.semiboldSystemFont(12);
            caption2.textColor = uniText;
            // Add profit value
            let value2 = w.addText(`${profitUSD < 0 ? '-' : ''}$${financialFormat(Math.abs(profitUSD))}`);
            value2.font = Font.mediumSystemFont(22);
            value2.minimumScaleFactor = 0.5;
            value2.textColor = profitUSD < 0 ? uniNegativeFees : uniPositiveFees;
            w.addSpacer();
            let range = w.addStack();
            range.centerAlignContent();
            let lower = range.addText(financialFormat(lowerTickPrice));
            lower.font = Font.mediumSystemFont(8);
            lower.minimumScaleFactor = 0.5;
            lower.lineLimit = 1;
            lower.textColor = uniText;
            range.addSpacer();
            let footnote = range.addText(`${financialFormat(currentPrice)}`);
            footnote.font = Font.semiboldSystemFont(10);
            footnote.minimumScaleFactor = 0.5;
            footnote.lineLimit = 1;
            footnote.textColor = uniText;
            range.addSpacer();
            let upper = range.addText(financialFormat(upperTickPrice));
            upper.font = Font.mediumSystemFont(8);
            upper.minimumScaleFactor = 0.5;
            upper.lineLimit = 1;
            upper.textColor = uniText;
            const rdtf = new RelativeDateTimeFormatter();
            rdtf.useNumericDateTimeStyle();
            let footnote2 = w.addText(`${currentPriceUnitDescription}, minted ${rdtf.string(new Date(createdTimestamp * 1000), new Date())}.\nGains +$${financialFormat(averageEarningsPerDayUSD)}/d on average.`);
            //footnote2.font = Font.caption2();
            footnote2.font = Font.systemFont(8);
            footnote2.minimumScaleFactor = 0.5;
            footnote2.lineLimit = 2;
            footnote2.textColor = uniText;
            return w;
        }
    };
    const parseWidgetParameter = (param) => {
        return param;
    };
    function financialFormat(n) {
        return n.toLocaleString(undefined, { 'minimumFractionDigits': 2, 'maximumFractionDigits': 2 });
    }
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
