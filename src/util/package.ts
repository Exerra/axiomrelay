export const getPackageJson = async () => {
    const file = Bun.file("package.json")

    return JSON.parse(await file.text())
}