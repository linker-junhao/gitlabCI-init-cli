const jsonFormat = require('json-format')
const path = require('path')
const { open } = require('fs/promises')


module.exports = {
  insertTestScript: async (templateParams) => {
    const pkgFile = await open(path.join(process.env.PWD, 'package.json'), 'r+')
    const pkgBuf = await pkgFile.readFile()
    const pkgContent = pkgBuf.toString()
    const pkgJson = JSON.parse(pkgContent)
    pkgJson.scripts = {
      ...pkgJson.scripts,
      "snapshot:prepare_test": "node ./ci_cd/copySnapshots.js --SNAPSHOT_OP=prepare_test",
      "snapshot:update_repo": "node ./ci_cd/copySnapshots.js --SNAPSHOT_OP=update_repo",
      "test:unit": `cross-env TEST_TYPE=unit jest --config ${templateParams._VAR_jestConfigPath} --coverage`,
      "test:snapshot_markup": `cross-env TEST_TYPE=snapshot_markup jest --config ${templateParams._VAR_jestConfigPath}`,
      "test:snapshot_visual": `cross-env TEST_TYPE=snapshot_visual jest --config ${templateParams._VAR_jestConfigPath}`
    }
    await pkgFile.truncate()
    await pkgFile.write(jsonFormat(pkgJson, {
      type: 'space',
      size: 2
    }).trim(), 0)
    pkgFile.close()
  }
}
