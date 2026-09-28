package com.onegit;

/** 4x2 wide contribution heatmap widget with stats. */
public class ContributionWide extends ContributionWidget {

    { big = true; }

    @Override
    protected int layoutId() { return R.layout.widget_contrib_wide; }
}
