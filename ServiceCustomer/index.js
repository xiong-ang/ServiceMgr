const { createClient, ACL, CreateMode } = require('node-zookeeper-client');

const zkClient = createClient('127.0.0.1:2181');
const promisify = require('util').promisify;

zkClient.connect();

zkClient.once('connected', () => {
    getServiceAddress().then((address) => {
        console.log(address.toString());

        zkClient.close();
    });
});

// 让zkClient支持promise
const proto = Object.getPrototypeOf(zkClient);
Object.keys(proto).forEach(fnName => {
    const fn = proto[fnName];
    if (proto.hasOwnProperty(fnName) && typeof fn === 'function') {
        zkClient[`${fnName}Async`] = promisify(fn).bind(zkClient);
    }
});

async function getServiceAddress(serviceName = 'Service1') {
    if (!serviceName) {
        return;
    }

    const servicePath = `/services/${serviceName}`;


    const addressNodes = await zkClient.getChildrenAsync(servicePath);

    const size = addressNodes.length;
    if (size === 0) {
        console.log('No service found.');
    }

    console.log(size + ' services found');
    let addressPath;
    if (size === 1) {
        addressPath = addressNodes[0];
    } else {
        // 这里你可以做负载均衡
        addressPath = addressNodes[parseInt(Math.random() * size)];
    }

    return await zkClient.getDataAsync(`${servicePath}/${addressPath}`);
}