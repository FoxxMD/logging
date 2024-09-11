const replacements = [
    {
        pattern: "\/assets\/",
        replace: "media://"
    }
];
const baseUrl = process.env.BASE_TD_URL;
if(baseUrl !== undefined && baseUrl.trim() !== '') {
    const cleaned = baseUrl.replace(/^["']/, '').replace(/["']$/, '');
    replacements.push(
        {
            pattern: "https:\/\/foxxmd.github.io\/logging",
            replace: cleaned
        }
    );
}

/** @type { import('typedoc').TypeDocOptionMap & import('typedoc-plugin-replace-text').Config } */
module.exports ={
    name: "@foxxmd/logging Docs",
    entryPoints: [
        "./src/index.ts",
        "./src/factory.ts"
    ],
    sort: ["source-order"],
    categorizeByGroup: false,
    searchGroupBoosts: {
        "Functions": 1.5
    },
    navigationLinks: {
        "Docs": "http://foxxmd.github.io/logging",
        "GitHub": "https://github.com/foxxmd/logging"
    },
    replaceText: {
        inIncludedFiles: true,
        replacements
    },
    plausibleSiteDomain: process.env.ANALYTICS ?? '',
    plausibleSiteOrigin: process.env.ANALYTICS_DOMAIN ?? '',
}
