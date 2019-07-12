const { createClient, ACL, CreateMode } = require('node-zookeeper-client');

const zkClient = createClient('127.0.0.1:2181');
const promisify = require('util').promisify;

zkClient.connect();

zkClient.once('connected', () => {
   registerService();
});

// 让zkClient支持promise
const proto = Object.getPrototypeOf(zkClient);
Object.keys(proto).forEach(fnName => {
  const fn = proto[fnName];
  if (proto.hasOwnProperty(fnName) && typeof fn === 'function') {
    zkClient[`${fnName}Async`] = promisify(fn).bind(zkClient);
  }
});

// host和port应该和部署系统结合分配
// serviceName要求唯一
async function registerService(serviceName = 'Service1', host = 'localhost', port = 8001) {
    try {
      // 创建根节点，持久节点
      const rootNode = await zkClient.existsAsync('/services');
      if (rootNode == null) {
        await zkClient.createAsync('/services', null, ACL.OPEN_ACL_UNSAFE, CreateMode.PERSISTENT);
      }
      // 创建服务节点，持久节点
      const servicePath = `/services/${serviceName}`;
      const serviceNode = await zkClient.existsAsync(servicePath);
      if (serviceNode == null) {
        await zkClient.createAsync(servicePath, null, ACL.OPEN_ACL_UNSAFE, CreateMode.PERSISTENT);
      }
      // 创建地址节点，临时顺序节点，这样name就不需要我们去维护了，递增
      const addressPath = `${servicePath}/address-`;
      const serviceAddress = `${host}:${port}`;
      const addressNode = await zkClient.createAsync(addressPath, Buffer.from(serviceAddress), ACL.OPEN_ACL_UNSAFE, CreateMode.EPHEMERAL_SEQUENTIAL);

    } catch (error) {
      throw new Error(error);
    }
}