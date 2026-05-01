module.exports = {
  // Webpack configuration overrides
  webpack: (config, env) => {
    // Fix for AJV validate function issue
    config.module.rules = config.module.rules.map(rule => {
      if (rule.test && rule.test.toString().includes('jsx')) {
        return {
          ...rule,
          use: rule.use.map(useRule => {
            if (useRule.loader && useRule.loader.includes('babel-loader')) {
              return {
                ...useRule,
                options: {
                  ...useRule.options,
                  plugins: [
                    ...(useRule.options.plugins || []),
                    '@babel/plugin-transform-runtime'
                  ]
                }
              }
            }
            return useRule
          })
        }
      }
      return rule
    })
    
    return config
  },
  
  // Jest configuration overrides
  jest: (config) => {
    config.globals = {
      ...config.globals,
      validate: jest.fn()
    }
    return config
  }
}
