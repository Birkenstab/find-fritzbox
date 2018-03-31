#!/usr/bin/env node

const net = require("net");
const http = require("http");
const os = require("os");

const IpAddr = require("./lib/ipAddr");

const maxSimultaneouslyConnections = 50;

const networkInterfaces = os.networkInterfaces();

const ifaces = Object.keys(networkInterfaces)
    .reduce((acc, ifname) => {
        networkInterfaces[ifname]
            .forEach(iface => {
                // Only IPv4 and no internal ips
                if (iface.family !== "IPv4" || iface.internal !== false)
                    return;
                iface.name = ifname;
                acc.push(iface);
            });
        return acc;
    }, []);

console.log(`Found ${ifaces.length} interfaces: ${ifaces.map(iface => iface.name).join(", ")}`);
scanAllInterfaces();

async function scanAllInterfaces() {
    for (let i = 0; i < ifaces.length; i++) {
        await scanInterface(ifaces[i]);
    }
}

async function scanInterface(iface) {
    const ip = new IpAddr(iface.address);
    const netmask = new IpAddr(iface.netmask);
    const first = netmask.and(ip);
    const last = netmask.not().or(ip);
    console.log("=====");
    console.log(`Starting scan of interface ${iface.name}`);
    console.log(`IP: ${iface.address}`);
    console.log(`Netmask: ${netmask}`);
    console.log(`Range: ${first} – ${last}`);
    console.log("=====");

    let promises = new Set();

    // Skip first and last (e.g. 192.168.1.0 and 192.168.1.255)
    for (let ip = first.next(); ip.compare(last) < 0; ip = ip.next()) {
        if (promises.size >= maxSimultaneouslyConnections)
            await Promise.race(promises);
        const promise = connect(ip.toString())
            .then(() => promises.delete(promise));
        promises.add(promise);
    }
    Promise.all(promises);

    console.log("=====");
    console.log(`Done scanning interface ${iface.name}`);
    console.log("=====");
}

async function connect(addr) {
    return new Promise(resolve => {
        const socket = net.createConnection({
            host: addr,
            port: 80,
            timeout: 1000
        });
        socket.on("connect", async () => {
            console.log(addr + " ist erreichbar");
            await checkForFritz(addr, socket);
            resolve(true);
        });
        socket.on("error", error => {
            if (error.code === "ENOENT" || error.code === "ECONNREFUSED" || error.code === "EHOSTUNREACH" || error.code === "EHOSTDOWN") {
            } else
                console.error(error);
            resolve(false);
        });
        socket.on("timeout", () => {
            resolve(false);
            socket.destroy();
        });
    });
}

async function checkForFritz(addr, socket) {
    return new Promise((resolve) => {
        http.get({
            hostname: addr,
            createConnection: function() {
                return socket; // Reuse socket
            }
        }, (resp) => {
            let data = "";
            resp.on("data", (chunk) => {
                data += chunk;
            });

            resp.on("end", () => {
                if (data.includes("FRITZ!Box")) {
                    console.log("FRITZ!Box gefunden: " + addr);
                }
                resolve();
            });

        }).on("error", (err) => {
            console.log("Error: " + err.message);
            resolve();
        });
    });
}
