const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

const contextMiddleware = (req, res, next) => {
  asyncLocalStorage.run(new Map(), () => {
    next();
  });
};

const getContext = () => {
  return asyncLocalStorage.getStore();
};

module.exports = {
  contextMiddleware,
  getContext
};
