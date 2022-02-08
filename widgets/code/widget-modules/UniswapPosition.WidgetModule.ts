// Based on https://github.com/au5ton/scriptable.app/blob/75cdb02e1229fc4c4338169657e4f782f9a935bf/PlexStreamsWidget.js

import { ErrorWidget } from "code/components/widgets/ErrorWidget"
import { SimpleTextWidget } from "code/components/widgets/SimpleTextWidget"
import { IWidgetModule } from 'code/utils/interfaces'
import { getJSON, GraphQL, RequestWithTimeout } from "code/utils/request-utils"

import { ResourceCache } from 'code/classes/ResourceCache';

const widgetModule: IWidgetModule = {
  createWidget: async (params) => {
    // extract user data
    const wallet = parseWidgetParameter(params.widgetParameter)

    console.log(await getUSDCPrice());
    console.log(await getUniswapPositionData(12345));

    // get interesting data
    const { liquidityUSD, unclaimedFees, token0Per1 } = await getUniswapData(wallet);

    const uniBackground = new Color('#191b1f', 1);
    const uniText = new Color('#ffffff', 1);
    const uniFees = new Color('#27ae60', 1);

    let w = new ListWidget()
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
}

const parseWidgetParameter = (param: string) => {
  return param;
}

export interface CalculatedPositionData {
  liquidityUSD: number;
  unclaimedFeesUSD: number;
  unclaimedFeesToken0: number;
  unclaimedFeesToken1: number;
  lowerTickPrice: number;
  upperTickPrice: number;
}

// Data fetching function
async function getUniswapData(wallet: string) {
  const res = await getJSON<UniswapRawData>(`https://openapi.debank.com/v1/user/protocol?id=${wallet}&protocol_id=uniswap3`)

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
      .sort((a,b) => a.price - b.price);
    
    return `${(temp[1].price / temp[0].price).toFixed(2)} ${temp[0].symbol} per ${temp[1].symbol}`;
  })();

  return {
    liquidityUSD,
    unclaimedFees,
    token0Per1,
  }
}

async function getUSDCPrice(): Promise<number> {
  const res = await GraphQL<{ pool: { token0: { derivedETH: number }}}>('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', `{
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

export interface UniswapPositionData {
  position: {
    liquidity: string;
    depositedToken0: string;
    depositedToken1: string;
    feeGrowthInside0LastX128: string;
    feeGrowthInside1LastX128: string;
    token0: {
      "symbol": "WETH",
      "name": "Wrapped Ether",
      "decimals": "18"
    },
    token1: {
      "symbol": "ENS",
      "name": "Ethereum Name Service",
      "decimals": "18"
    },
    pool: {
      "token0Price": "0.006911236898785827806599111302614376",
      "token1Price": "144.6919002553191139925102865402731",
      "feeGrowthGlobal0X128": "6928672878923113891342059631592133600",
      "feeGrowthGlobal1X128": "774293355098136139759588828873186225683"
    },
    tickLower: {
      "price0": "118.6005609028508220396735047529408",
      "price1": "0.008431663327622279637587342661677031",
      "feeGrowthOutside0X128": "6650372266730698279404952502461740262",
      "feeGrowthOutside1X128": "733842066852084959457638020760453617506"
    },
    tickUpper: {
      "price0": "161.0549992566540461516222178544296",
      "price1": "0.00620905904576373859162487733190652",
      "feeGrowthOutside0X128": "0",
      "feeGrowthOutside1X128": "0"
    }
  }
}

async function getUniswapPositionData(positionID: number): Promise<UniswapPositionData> {
  return (await GraphQL<UniswapPositionData>('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', `{
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
  }`)).data
}

export interface UniswapRawData {
  portfolio_item_list: {
    stats: {
      net_usd_value: number;
    }
    detail: {
      supply_token_list: TokenPosition[],
      reward_token_list: TokenPosition[],
    }
  }[];
}

export interface TokenPosition {
  id: string;
  name: string;
  symbol: string;
  price: number;
  amount: number;
}

module.exports = widgetModule;
