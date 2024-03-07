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
        replacements: [
            {
                pattern: "\/assets\/",
                replace: "media://"
            }
        ]
    }
}
