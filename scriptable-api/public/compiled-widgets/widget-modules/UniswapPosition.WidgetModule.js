(function () {

    /** makes debugging JSON responses easier when something goes wrong */
    async function getJSON(path) {
        const req = new Request(path);
        req.headers = {
            Accept: 'application/json'
        };
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
            const wallet = parseWidgetParameter(params.widgetParameter);
            console.log(await getUSDCPrice());
            console.log(await getUniswapPositionData(12345));
            // get interesting data
            const { liquidityUSD, unclaimedFees, token0Per1 } = await getUniswapData(wallet);
            const uniBackground = new Color('#191b1f', 1);
            const uniText = new Color('#ffffff', 1);
            const uniFees = new Color('#27ae60', 1);
            let w = new ListWidget();
            w.backgroundColor = uniBackground;
            w.useDefaultPadding();
            // Add "liquidity" caption
            let caption1 = w.addText('Liquidity');
            caption1.font = Font.semiboldSystemFont(12);
            caption1.textColor = uniText;
            // Add liquidity value
            let value1 = w.addText(`$${liquidityUSD.toLocaleString()}`);
            value1.font = Font.regularSystemFont(18);
            value1.minimumScaleFactor = 0.5;
            value1.textColor = uniText;
            w.addSpacer();
            // Add "unclaimed fees" caption
            let caption2 = w.addText('Unclaimed fees');
            caption2.font = Font.semiboldSystemFont(12);
            caption2.textColor = uniText;
            // Add unclaimed fees value
            let value2 = w.addText(`$${unclaimedFees.toLocaleString()}`);
            value2.font = Font.semiboldSystemFont(22);
            value2.minimumScaleFactor = 0.5;
            value2.textColor = uniFees;
            w.addSpacer();
            let footnote = w.addText(token0Per1);
            footnote.font = Font.footnote();
            footnote.minimumScaleFactor = 0.5;
            footnote.lineLimit = 1;
            footnote.textColor = uniText;
            return w;
        }
    };
    const parseWidgetParameter = (param) => {
        return param;
    };
    // Data fetching function
    async function getUniswapData(wallet) {
        const res = await getJSON(`https://openapi.debank.com/v1/user/protocol?id=${wallet}&protocol_id=uniswap3`);
        const liquidityUSD = res.portfolio_item_list
            .map(e => e.stats.net_usd_value)
            .reduce((s, v) => s + v)
            .toFixed(2);
        const unclaimedFees = res.portfolio_item_list
            .map(e => e.detail.reward_token_list)
            .flat()
            .map(e => e.price * e.amount)
            .reduce((s, v) => s + v)
            .toFixed(2);
        const token0Per1 = (() => {
            const temp = res.portfolio_item_list[0].detail.supply_token_list
                .sort((a, b) => a.price - b.price);
            return `${(temp[1].price / temp[0].price).toFixed(2)} ${temp[0].symbol} per ${temp[1].symbol}`;
        })();
        return {
            liquidityUSD,
            unclaimedFees,
            token0Per1,
        };
    }
    async function getUSDCPrice() {
        const res = await GraphQL('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', `{
    pool(id: "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8") {
      token0 {
        name
        symbol
        derivedETH
      }
      token1 {
        name
        symbol
        derivedETH
      }
    }
  }`);
        return 1 / res.data.pool.token0.derivedETH;
    }
    async function getUniswapPositionData(positionID) {
        return (await GraphQL('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', `{
    position(id:${positionID}) {
      liquidity
      depositedToken0
      depositedToken1
      feeGrowthInside0LastX128
      feeGrowthInside1LastX128
      token0 {
        symbol
        name
        decimals
      }
      token1 {
        symbol
        name
        decimals
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
