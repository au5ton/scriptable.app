import { Button, fade } from '@material-ui/core';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardMedia from '@material-ui/core/CardMedia';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import clsx from 'clsx';
import React from 'react';
import { WidgetModule } from '../interfaces';

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            display: 'flex',
            maxWidth: 320,
            minWidth: 320,
            height: 150,
            margin: theme.spacing(2),
            marginLeft: theme.spacing(1),
            transition: "all 300ms ease-in-out",
            outline: `3px transparent solid`,
            cursor: 'pointer',
        },
        rootIsSelected: {
            transform: "transform(1.1)",
            boxShadow: theme.shadows[5],
            background: fade(theme.palette.primary.main, 0.1),
            outline: `3px ${theme.palette.primary.main} solid`,
        },
        details: {
            display: 'flex',
            flexDirection: 'column',
        },
        content: {
            flex: '1 0 auto',
            paddingBottom: '8px',
        },
        cardTitle: {
            lineHeight: 1.1,
            marginBottom: '0.75rem',
        },
        cover: {
            width: 150,
            backgroundSize: "cover",
            backgroundPositionX: 0, // was -14
            flexShrink: 0
        },
        controls: {
            display: 'flex',
            alignItems: 'center',
            paddingLeft: theme.spacing(1),
            paddingBottom: theme.spacing(1),
        },
        playIcon: {
            height: 38,
            width: 38,
        },
    }),
);

interface Props {
    widgetModule: WidgetModule;
    isSelected: boolean;
    onSelect: () => void;
}

export const WidgetModuleCard = ({ widgetModule, isSelected, onSelect }: Props) => {
    const classes = useStyles();

    return (
        <Card className={clsx({ [classes.root]: true, [classes.rootIsSelected]: isSelected })} onClick={(event) => {
            // Scroll into view
            // (this is broken)
            //event.currentTarget.parentElement.scrollLeft = event.currentTarget.offsetLeft - 16;
            onSelect();
        }}>
            <div className={classes.details}>
                <CardContent className={classes.content}>
                    <Typography className={classes.cardTitle} component="h6" variant="h6">
                        {widgetModule.meta.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        {widgetModule.meta.description}
                    </Typography>
                </CardContent>
                {/* <div className={classes.controls}>
                    <Button disabled={isSelected} color="primary" onClick={onSelect} variant={"text"}>
                        {isSelected ? "Selected" : "Select"}
                    </Button>
                </div> */}
            </div>
            <CardMedia
                className={classes.cover}
                image={widgetModule.imageSrc}
                title={`${widgetModule.meta.name} screenshot`}
            />
        </Card>
    );
}