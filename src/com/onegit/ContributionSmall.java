package com.onegit;

/** 2x2 compact contribution heatmap widget. */
public class ContributionSmall extends ContributionWidget {

    { weeksLimit = 18; small = true; }

    @Override
    protected int layoutId() { return R.layout.widget_contrib_small; }
}
