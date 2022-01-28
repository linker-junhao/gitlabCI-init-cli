

const { readdir, lstat, readFile, open } = require('fs/promises');
const jsonTemplateParse = require("json-templates");
const copy = require('recursive-copy')
const pathJoin = require('path').join;

const visitTemplateFileInDir = async (path, action = (filePath) => {}) => {
  if(path) {
    try {
      const files = await readdir(path);
      for (const file of files) {
        const filePath = `${path}/${file}`
        const stat = await lstat(filePath)
        if(stat.isDirectory()) {
          await visitTemplateFileInDir(filePath, action)
        } else {
          if(/\.template$/.test(file)) {
            action(filePath)
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  }
}

module.exports = {
  genFiles: async (templateParams) => {
    const tmpFilePath = `${__dirname}/tmp.file`
    const tmpFile = await open(tmpFilePath, 'w+')
    const templateDir = `${__dirname}/../template`
    console.log(templateDir)
    // 读取模版文件
    await visitTemplateFileInDir(templateDir, async (path) => {
      try {
        const tmplateFile = await open(path)
        const fileContent = (await tmplateFile.readFile()).toString()
        tmplateFile.close()
        const template = jsonTemplateParse(fileContent)
        const targetContent = template(templateParams)
        const targetPath = pathJoin(
          process.env.PWD,
          path.replace(new RegExp(`^${templateDir}`), '').replace(/\.template$/, '')
        )
        await copy(
          tmpFilePath,
          targetPath,
          {
            overwrite: true
          }
        )
        const targetFile = await open(targetPath, 'w+')
        await targetFile.writeFile(targetContent)
        targetFile.close()
      }catch(e) {
        console.error(e)
      }
    })
    tmpFile.close()
  }
}