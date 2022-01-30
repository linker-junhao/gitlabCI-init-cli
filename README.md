# GitLab CI init cli

## 1 作用 {#usage}
用于生成gitlab ci的相关配置文件，在对应的git工作流程中触发相关的pipeline（pipeline即流水线，一系列的自动任务的执行）。

## 2 前提配置 {#require-config-before-run}
### 2.1 快照git submodule {#require-config-git-submodule}
将快照git repo以submodule的形式增加到项目中。
```bash
git submodule add https://YOUR-SNAPSHOT-GIT-REPO-URL
```
### 2.2 Gitlab环境变量 {#require-config-gitlab-env-var}
在```对应项目 > setting > CI/CD > Variable```下添加三个变量。
* DD_ROBOT_TOKEN：钉钉机器人的accessToken，用于推送通知消息到钉钉群。
* GIT_ACCESS_TOKEN：对快照仓库有读写权限的访问Token，可以在有权限的账号下生成一个（在```User Settings > Access Tokens```下操作）。
* GIT_USERNAME_DING_MOBILE：git账号名映射钉钉账号的JSON格式字符串（必须无空格，无换行）。
```json
// 例如
{"san.zhang":"159xxxxxxxx"}
```

### 2.3 storybook {#require-config-storybook}
#### 2.3.1 安装 {#require-config-storybook-install}
> storybook的基本安装可以在其官网文档找到详细的说明：https://storybook.js.org/docs/vue/get-started/install

> storybook快照测试插件的安装：https://storybook.js.org/docs/react/writing-tests/snapshot-testing

#### 2.3.2 storybook配置 {#storybook-config}
将```.storybook/main.js```配置文件修改。
```javascript
// .storybook/main.js，示例配置
const path = require('path')
const utils = require('../build/utils')

function resolve (dir) {
  return path.join(__dirname, '..', dir)
}

module.exports = {
  "stories": [
    "../stories/**/*.stories.mdx",
    "../stories/**/*.stories.@(js|jsx|ts|tsx)"
  ],
  "addons": [
    "@storybook/addon-links",
    "@storybook/addon-essentials"
  ],
  "core": {
    "builder": "webpack5"
  },
  webpackFinal: async (config, { configType }) => {
    config.resolve.alias['@'] = resolve('client')
    config.module.rules.push(
      ...(utils.styleLoaders({
        sourceMap: false,
        usePostCSS: true 
      }).filter(rule => {
        return rule.test.toString() !== /\.css$/.toString()
      }))
    )
    if (config.infrastructureLogging) {
      config.infrastructureLogging.level = 'info'
    } else {
      config.infrastructureLogging = {
        level: 'info'
      }
    }
    return config
  }
}
```

#### 2.3.3 加入测试文件 {#require-config-storybook-test-file}
需要添加两个测试文件，分别对应标记快照测试与视觉快照测试：```storybook.markupsnapshot.test.js```和```storybook.visualsnapshot.test.js```，这两个文件名与[2.4.1 testMatch配置](#require-config-jest-testMatch)中的```snapshot_markup```和```snapshot_visual```配置项应该保持一致。
```javascript
// storybook.markupsnapshot.test.js
import initStoryshots, { multiSnapshotWithOptions, Stories2SnapsConverter } from '@storybook/addon-storyshots'

initStoryshots({
  suite: 'markup storyshots',
  // this creates a *.snap.js for each *.stories.js I have
  test: multiSnapshotWithOptions(),
  // this tells storybook we're to look for stories (I have all mine in one folder) but as far as I know it searches down recursively from here
  stories2snapsConverter: new Stories2SnapsConverter({
    // This puts all my *.snaps.js in a __snapshots__ folder next to my stories folder, the default is to have them next to the *.stories.js files themselves
    snapshotsDirName: '__snapshots__'
  })
})
```
```javascript
// storybook.visualsnapshot.test.js
import initStoryshots from '@storybook/addon-storyshots'
import { imageSnapshot } from '@storybook/addon-storyshots-puppeteer'
import path from 'path'

const getScreenshotOptions = ({ context, url }) => {
  return {
    encoding: 'binary', // encoding: 'base64' is a property required by puppeteer
    fullPage: false // Do not take the full page screenshot. Default is 'true' in Storyshots.,
  }
}

// Function to customize the snapshot location
const getMatchOptions = ({ context: { fileName } }) => {
  // Generates a custom path based on the file name and the custom directory.
  const snapshotPath = path.join(path.resolve(__dirname), path.dirname(fileName), '__image_snapshots__')
  return { customSnapshotsDir: snapshotPath }
}

initStoryshots({
  suite: 'Image storyshots',
  test: imageSnapshot({
    storybookUrl: `file://${path.resolve(__dirname, '../storybook-static')}`,
    getScreenshotOptions,
    getMatchOptions
  })
})
```


### 2.4 jest配置文件 {#require-config-jest}
#### 2.4.1 testMatch配置 {#require-config-jest-testMatch}
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

#### 2.4.2 reporters配置 {#require-config-jest-reporters}
>reporters配置项的详细文档说明可以在jest文档中查阅：https://jestjs.io/zh-Hans/docs/27.2/configuration#reporters-arraymodulename--modulename-options

配置reporters的目的是为了将测试的结果送到gitlab中，使gitlab可以直接展示我们的测试结果，目前我们的gitlab版本（12.5.4）只接受```junit xml```格式的测试结果。

首先通过npm安装```jest-junit```。
```bash
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

## 3 使用 {#how-to-run}
### 3.1 运行程序 {#install-and-run}
首先通过npm安装
```bash
npm install gitlabci-init-cli
```
执行
```bash
gitlabci-init
```
最后输入对应的参数即可。

### 3.2 运行后的产物 {#product}
会在你的项目根目录下添加以下文件
```
├── .gitlab-ci.yml
└── ci_cd
    ├── copySnapshots.js
    ├── dingdingMsgAlert.js
    └── useConfigFileHelper.js
```
* .gitlab-ci.yml
知道gitlab执行流水线的文件。
* copySnapshots.js
用于从快照项目目录拷贝基准快照到需要做测试的项目目录，或者将项目目录中更新后的快照拷贝到快照项目目录。
* dingdingMsgAlert.js
用于推送钉钉通知消息。
* useConfigFileHelper.js
用于获取到测试配置文件（默认```.xt-testing.config.js```）中的配置，其它程序需要使用配置时，会调用此模块的```useConfigFile```函数。
## 4 触发的gitlab pipeline {#details-of-pipeline}
### 4.1 执行单元测试/快照测试 {#pipeline-test}
* 作用：为合并一个merge request的review提供参考。我们假设单元测试/快照测试都是有效的，如果通过了这些测试，那很大程度上，我们可以信任这是一个靠谱的提交。
* 过程：
    * 单元测试：执行单元测试本质上是执行了```npm run test:unit```
    * 快照测试：快照测试使用已有的stable快照作为基准，在此基准上执行快照测试。在过程上，stable快照存储在一个单独的git repo中（这是因为快照以图片的形式存在，存储在当前的项目git repo中会使项目变得臃肿），以git submodule的形式存在于主项目中且分支名与项目的分支名一致，当merge request创建后执行快照测试时，会到快照项目目录下切换分支到merge request的目标分支名（target branch name），然后将基准快照同步到开发的项目中，再执行快照测试以找到此次merge request与基准有所差异的地方。
* 触发条件：当一个源分支名（source branch name）不满足```/^.+-stable$/```，目标分支名（target branch name）满足```/^.+-stable$/```的merge request被创建时，该pipeline将会被触发。
### 4.2 保存基准快照（stable快照）{#pipeline-save-baseline-snapshot}
* 作用：当merge request通过后，我们理解此次变动被review并且接受，所以基准快照将基于这次新的提交生成，并且成为新的基准，以备下一次快照测试。
* 过程：执行快照更新，本质上执行的是```npm run test:snapshot_markup -- -u && npm run test:snapshot_visual -- -u```，并且将更新后的快照移动到快照的项目目录下，并且commit&push。
* 触发条件：当分支名满足```/^.+-stable$/```的分支被push commit时将会触发。

# 参考
1. https://storybook.js.org/docs
2. https://jestjs.io/zh-Hans/docs/snapshot-testing
3. https://segmentfault.com/a/1190000014720175
4. https://www.infoq.cn/article/visual-perception-test
5. https://blog.axiu.me/jest-what-is-snapshot/
6. https://lmiller1990.github.io/vue-testing-handbook/zh-CN/
7. https://www.freecodecamp.org/news/the-front-end-test-pyramid-rethink-your-testing-3b343c2bca51/
8. https://gist.github.com/shilman/8856ea1786dcd247139b47b270912324
9. https://docs.gitlab.com/ee/ci/
