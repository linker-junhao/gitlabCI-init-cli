# GitLabCi init cli

## 1 作用
用于生成gitlab ci的相关配置文件，在对应的git工作流程中触发相关的pipeline（pipeline即流水线，一系列的自动任务的执行）。

## 2 前提配置
### 2.1 快照git submodule
将快照git repo以submodule的形式增加到项目中。
```shell
git submodule add https://your-snapshot-git-repo-url
```
### 2.2 Gitlab环境变量
在```对应项目 > setting > CI/CD > Variable```下添加三个变量。
* DD_ROBOT_TOKEN：钉钉机器人的accessToken，用于推送通知消息到钉钉群。
* GIT_ACCESS_TOKEN：对快照仓库有读写权限的访问Token，可以在有权限的账号下生成一个（在```User Settings > Access Tokens```下操作）。
* GIT_USERNAME_DING_MOBILE：git账号名映射钉钉账号的JSON格式字符串（必须无空格，无换行）。
```json
// 例如
{"san.zhang":"159xxxxxxxx"}
```
### 2.3 jest配置文件
#### 2.3.1 testMatch配置
>testMatch配置项的详细文档说明可以在jest文档中查阅：https://jestjs.io/zh-Hans/docs/27.2/configuration#testmatch-arraystring

我们在这个预设的gitlab ci中，区分了四种jest测试任务，它们分别对应四个```process.env.TEST_TYPE```变量值，分别是：单元测试```unit```、标签快照测试```snapshot_markup```、视觉快照测试```snapshot_visual```、所有测试```all```，
在你的jest配置文件中，设置对应的不同```process.env.TEST_TYPE```变量值的```testMatch```。
```javascript
// 这个函数可以根据不同的process.env.TEST_TYPE值获取到对应的match配置，如果你有自己定义的测试文件类型，可以修改函数体内容来做适配。
const getTestMatchByEnv = () => {
  const matchMap = {
    unit: ['<rootDir>/client/**/?(*.)+(spec|test).[jt]s?(x)'],
    snapshot_markup: ['<rootDir>/stories/storybook.markupsnapshot.test.js'],
    snapshot_visual: ['<rootDir>/stories/storybook.visualsnapshot.test.js'],
    all: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)']
  }
  return matchMap[process.env.TEST_TYPE || 'all']
}

// 设置testMatch配置项
module.exports = {
    // 你的其它配置项...
    testMatch: getTestMatchByEnv()
}
```

#### 2.3.2 reporters配置
>reporters配置项的详细文档说明可以在jest文档中查阅：https://jestjs.io/zh-Hans/docs/27.2/configuration#reporters-arraymodulename--modulename-options

配置reporters的目的是为了将测试的结果送到gitlab中，使gitlab可以直接展示我们的测试结果，目前我们的gitlab版本（12.5.4）只接受```junit xml```格式的测试结果。

首先通过npm安装```jest-junit```。
```shell
npm i jest-junit
```
然后在jest配置文件中的reporters配置项中加入junit。
```javascript
// 设置testMatch配置项
module.exports = {
    // 你的其它配置项...
    reporters: [
        // 你的其它reporter...
        [
            'jest-junit',
            {
                // 这个输出目录应该与后文中【使用】章节中的“测试报告的目录”一致。
                outputDirectory: './test/unit/coverage'
            }
        ]
    ]
}
```

## 3 使用



## 4 触发的gitlab pipeline：
### 4.1 执行单元测试/快照测试
* 作用：为合并一个merge request的review提供参考。我们假设单元测试/快照测试都是有效的，如果通过了这些测试，那很大程度上，我们可以信任这是一个靠谱的提交。
* 过程：
    * 单元测试：执行单元测试本质上是执行了```npm run test:unit```
    * 快照测试：快照测试使用已有的stable快照作为基准，在此基准上执行快照测试。在过程上，stable快照存储在一个单独的git repo中（这是因为快照以图片的形式存在，存储在当前的项目git repo中会使项目变得臃肿），以git submodule的形式存在于主项目中且分支名与项目的分支名一致，当merge request创建后执行快照测试时，会到快照项目目录下切换分支到merge request的目标分支名（target branch name），然后将基准快照同步到开发的项目中，再执行快照测试以找到此次merge request与基准有所差异的地方。
* 触发条件：当一个源分支名（source branch name）不满足```/^.+-stable$/```，目标分支名（target branch name）满足```/^.+-stable$/```的merge request被创建时，该pipeline将会被触发。
### 4.2 保存基准快照（stable快照）
* 作用：当merge request通过后，我们理解此次变动被review并且接受，所以基准快照将基于这次新的提交生成，并且成为新的基准，以备下一次快照测试。
* 过程：执行快照更新，本质上执行的是```npm run test:snapshot_markup -- -u && npm run test:snapshot_visual -- -u```，并且将更新后的快照移动到快照的项目目录下，并且commit&push。
* 触发条件：当分支名满足```/^.+-stable$/```的分支被push commit时将会触发。
