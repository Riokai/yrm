#!/usr/bin/env node
const program = require('commander')
const extend = require('extend')
const childProcess = require('child_process')
const request = require('request')
const async = require('async')
const resource = require('./resource.json')
const pkg = require('./package.json')


program
  .version(pkg.version)

program
  .command('ls')
  .description('List all the registries')
  .action(onList)

program
  .command('current')
  .description('Show current registry name')
  .action(showCurrent)


program
  .command('use <registry>')
  .description('Change registry to registry')
  .action(onUse)

program
  .command('test [registry]')
  .description('Show response time for specific or all registries')
  .action(onTest)

program
  .parse(process.argv)

if (process.argv.length === 2) {
  program.outputHelp()
}

/*//////////////// cmd methods /////////////////*/

function onUse(name) {
  const allRegistries = getAllRegistry()

  if (allRegistries.hasOwnProperty(name)) {
    const registry = allRegistries[name]

    childProcess.exec(`yarn config set registry ${registry.registry}`, (err, stdout, stderr) => {
      if (err) exit(err)

      getCurrentRegistry(function (current) {
        printMsg([
          '', '   Registry has been set to: ' + current, ''
        ])
      })
    })
  } else {
    printMsg([
      '', '   Not find registry: ' + name, ''
    ])
  }
}

function getCurrentRegistry(func) {
  childProcess.exec('yarn config get registry', (err, stdout, stderr) => {
    if (err) exit(err)

    func(stdout.replace(/\n|\r/gi, ''))
  })
}

function showCurrent() {
  getCurrentRegistry(function(cur) {
    const allResource = getAllRegistry()
    Object.keys(allResource).forEach(function(key) {
      var item = allResource[key]
      if (item.registry.replace(/\//g, '') === cur.replace(/\//g, '')) {
        printMsg([key])
        return
      }
    })
  })
}

function onList() {
  getCurrentRegistry(function(cur) {
    const info = ['']
    const allResource = getAllRegistry()

    Object.keys(allResource).forEach(function(key) {
      const item = allResource[key]
      const prefix = item.registry.replace(/\//g, '') === cur.replace(/\//g, '') ? '* ' : '  '
      info.push(prefix + key + line(key, 8) + item.registry)
    })

    info.push('')
    printMsg(info)
  })
}

function getAllRegistry() {
    return extend({}, resource)
}

function onTest(registry) {
  const allRegistries = getAllRegistry()

  let toTest

  if (registry) {
      if (!allRegistries.hasOwnProperty(registry)) {
          return
      }
      toTest = only(allRegistries, registry)
  } else {
      toTest = allRegistries
  }

  async.map(Object.keys(toTest), function(name, cbk) {
      const registry = toTest[name]
      const start = +new Date()
      request(registry.registry + 'pedding', function(error) {
          cbk(null, {
              name: name,
              registry: registry.registry,
              time: (+new Date() - start),
              error: error ? true : false
          })
      })
  }, function(err, results) {
      getCurrentRegistry(function(cur) {
          const msg = ['']
          results.forEach(function(result) {
              var prefix = result.registry === cur ? '* ' : '  '
              var suffix = result.error ? 'Fetch Error' : result.time + 'ms'
              msg.push(prefix + result.name + line(result.name, 8) + suffix)
          })
          msg.push('')
          printMsg(msg)
      })
  })
}

function printMsg(infos) {
    infos.forEach(function(info) {
        console.log(info)
    })
}

function exit(err) {
    printErr(err)
    process.exit(1)
}

function printErr(err) {
    console.error('an error occured: ' + err)
}

function line(str, len) {
    var line = new Array(Math.max(1, len - str.length)).join('-')
    return ' ' + line + ' '
}
