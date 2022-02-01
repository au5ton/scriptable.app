(function () {

    // Based on "Apple Event Calendar" by @JacobEthanWhite
    const widgetModule = {
        createWidget: async (params) => {
            // extract user data
            const { date, title, emoji, startColor: startColorHex, endColor: endColorHex } = parseWidgetParameter(params.widgetParameter);
            const countDownDate = new Date(date).getTime();
            const now = new Date().getTime();
            const distance = countDownDate - now;
            const days = Math.ceil(distance / (1000 * 60 * 60 * 24));
            let w = new ListWidget();
            w.useDefaultPadding();
            w.spacing = 2;
            let logo = w.addText(emoji);
            logo.font = Font.systemFont(30);
            logo.minimumScaleFactor = 0.75;
            let titleText = w.addText(title);
            titleText.font = Font.semiboldSystemFont(18);
            titleText.textColor = Color.white();
            titleText.minimumScaleFactor = 0.45;
            let daysText = w.addText(days.toString(10));
            daysText.font = Font.semiboldSystemFont(28);
            daysText.textColor = Color.white();
            daysText.minimumScaleFactor = 0.95;
            let daysText2 = w.addText('days');
            daysText2.font = Font.semiboldSystemFont(20);
            daysText2.textColor = Color.white();
            daysText2.minimumScaleFactor = 0.8;
            logo.centerAlignText();
            titleText.centerAlignText();
            daysText.centerAlignText();
            daysText2.centerAlignText();
            //make a gradient
            let startColor = new Color(startColorHex, 1);
            let endColor = new Color(endColorHex, 1);
            let gradient = new LinearGradient();
            gradient.colors = [startColor, endColor];
            gradient.locations = [0.0, 1];
            w.backgroundGradient = gradient;
            //w.backgroundColor = new Color("#ff5401")
            return w;
        }
    };
    const parseWidgetParameter = (param) => {
        // handles: date:2021-10-22,title:Birthday,emoji:🍰,startColor:#f00,endColor:#050530
        const paramParts = param
            .split(',')
            .map(e => e.includes(':') ? ({
            key: e.substring(0, e.indexOf(':')).toLocaleLowerCase().trim(),
            value: e.substring(e.indexOf(':') + 1).trim(),
        }) : null);
        const givenOptions = {};
        for (let pair of paramParts) {
            if (pair !== null) {
                givenOptions[pair.key] = pair.value;
            }
        }
        console.log('givenOptions');
        console.log(givenOptions);
        let _temp = new Date();
        _temp.setDate(_temp.getDate() + 45);
        let date = _temp.toISOString();
        let title = 'Placeholder';
        let emoji = '🔔';
        let startColor = '#3050cc';
        let endColor = '#050530';
        if (givenOptions['date'] !== undefined)
            date = givenOptions['date'];
        if (givenOptions['title'] !== undefined)
            title = givenOptions['title'];
        if (givenOptions['emoji'] !== undefined)
            emoji = givenOptions['emoji'];
        if (givenOptions['startcolor'] !== undefined)
            startColor = givenOptions['startcolor'];
        if (givenOptions['endcolor'] !== undefined)
            endColor = givenOptions['endcolor'];
        return {
            date,
            title,
            emoji,
            startColor,
            endColor,
        };
    };
    module.exports = widgetModule;

}());
