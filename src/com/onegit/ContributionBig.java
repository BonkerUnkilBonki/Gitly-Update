package com.onegit;

/** 4x4 contribution heatmap widget with full-year graph and stats. */
public class ContributionBig extends ContributionWidget {

    { big = true; }

    @Override
    protected int layoutId() { return R.layout.widget_contrib_big; }
}
