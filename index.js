const prompts = require('prompts');
const { genFiles } = require('./genFilesFromTemplate');

(async () => {
  const templateParams = await prompts([
    // 快照项目目录与当前业务项目目录的相对路径
    {
      type: 'text',
      name: '_VAR_snapshotDirRelativePath',
      message: '请输入快照项目目录与当前业务项目目录的相对路径。',
      validate: value => !!value || '请输入相对路径'
    },
    // 快照项目的git地址（比如：https://atta-gitlab.xtrfr.cn/atta-team/frontend_base/boss/bossfrontend-snapshots.git）
    {
      type: 'text',
      name: '_VAR_gitRepoUrl',
      message: '快照项目的gitlab地址（比如：https://atta-gitlab.xtrfr.cn/atta-team/frontend_base/boss/bossfrontend-snapshots.git）',
      validate: value => /^http(s?):\/\/[^\s]+\.git$/.test(value) || '请输入合法的git地址'
    },
    // 测试配置文件的文件名（默认：xt-testing.config）
    {
      type: 'text',
      name: '_VAR_configFileName',
      message: '测试配置文件的文件名（默认：xt-testing.config）',
      initial: 'xt-testing.config',
      validate: value => !!value || '请输入文件名'
    },
    // jest配置文件路径
    {
      type: 'text',
      name: '_VAR_jestConfigPath',
      message: 'jest配置文件的路径',
      initial: 'test/jest.conf.js',
      validate: value => !!value || '请输入jest配置文件的路径'
    },
    // 测试报告的目录（默认：test/unit/coverage），测试执行完成后目录下应该有一个对应的junit.xml报告产物
    {
      type: 'text',
      name: '_VAR_testReportDirPath',
      message: '测试报告的目录路径（默认：test/unit/coverage），测试执行完成后目录下应该有一个对应的junit.xml报告产物',
      initial: 'test/unit/coverage',
      validate: value => !!value || '请输入测试报告的目录路径'
    },
    // 标签值，会通过标签值将这些自动任务分发到对应有这些标签的gitlab runner上
    {
      type: 'text',
      name: '_VAR_tag',
      message: '标签，会通过标签值将这些自动任务分发到对应有这些标签的gitlab runner上',
      validate: value => !!value || '请输入任务的标签'
    }
  ])

  templateParams._VAR_gitRepoUrl = templateParams._VAR_gitRepoUrl.replace(/^http(s?):\/\//, '')

  genFiles(templateParams)
  // 根据输入参数生成文件


  // 在package.json中插入对应的命令
})();