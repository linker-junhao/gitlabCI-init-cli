const copy = require('recursive-copy')
const path = require('path')
const fs = require('fs')
const configFileHelper = require('./useConfigFileHelper')
const args = require('minimist')(process.argv.slice(2))

if (args.SNAPSHOT_OP === 'prepare_test') {
  configFileHelper.useConfigFile(config => {
    const srcPath = path.join(config.SNAPSHOTS_DIR, config.APP_NAME)
    if (fs.existsSync(srcPath)) {
      copy(
        srcPath,
        path.join(process.env.PWD, 'stories'),
        {
          overwrite: true,
          filter: ['**/**/*.storyshot', '**/**/*-snap.png', '**/**/*-diff.png']
        }
      ).then(res => {
        console.info('===> sanpshots copy to stories success, ready to test!')
      }).catch(err => {
        console.error(err)
      })
    }
  })
}

if (args.SNAPSHOT_OP === 'update_repo') {
  configFileHelper.useConfigFile(config => {
    copy(
      path.join(process.env.PWD, 'stories'),
      path.join(config.SNAPSHOTS_DIR, config.APP_NAME),
      {
        overwrite: true,
        filter: ['**/**/*.storyshot', '**/**/*-snap.png', '**/**/*-diff.png']
      }
    ).then(res => {
      console.info('===> sanpshots repo update success!')
    }).catch(err => {
      console.error(err)
    })
  })
}
