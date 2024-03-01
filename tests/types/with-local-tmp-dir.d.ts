declare module 'with-local-tmp-dir' {

    interface withLocalTmpDirOptions {
        unsafeCleanup?: boolean
        dir?: string
        prefix?: string
    }
    function withLocalTmpDirFunc(func: () => Promise<void>, args?: withLocalTmpDirOptions): Promise<string>
    export default withLocalTmpDirFunc
}
