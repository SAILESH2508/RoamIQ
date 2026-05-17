module.exports = {
  devServer: (devServerConfig) => {
    delete devServerConfig.https;
    return devServerConfig;
  },
};
