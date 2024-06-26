const net = require('node:net');
const path = require('path');
const ByteBuffer = require('bytebuffer');
const fs = require('fs');
const spawn = require('child_process').spawn;
const { app } = require('electron');
let win = null;

var replSocket = null;
var replInstance = null;
var replIsRunning = false;

var openGoalInstances = [];
var openGoalMainPort = 8111;

var runRepl = false;

class OpenGoal {

    constructor(window, runDebugger) {
        win = window;
        runRepl = runDebugger;
     }
     

    // --- GOAL COMUNICATION ---
    async preStartREPL() {

        let ogPath = await getOpenGoalPath();
        if (!ogPath) return;

        if (replSocket) {
            replSocket.end();
            replSocket.destroy();
        }
        replSocket = new net.Socket();

        if (replInstance) {
            this.killOG(openGoalMainPort);
            await sleep(1500);
        }

        //start REPL
        replInstance = spawn(path.join(ogPath, "goalc"), [], {detached: true, shell: true, stdio: [ 'ignore', 'pipe', 'ignore']});

        //On kill
        replInstance.stdout.on('end', () => {
            replInstance = null;
            replIsRunning = false;
        });

        //On Full Start
        replInstance.on('spawn', async () => {
            await sleep(1500);
            //connect to REPL
            replSocket.connect(8181, '127.0.0.1', () => { this.sendClientMessage('Connection made with REPL!'); });
            replSocket.on('connect', async () => {
                replIsRunning = true;
                this.writeGoalCommand("(mng)");
            });
    
            replSocket.on('error', (ex) => {
                if (!openGoalInstances.find(x => x.port === openGoalMainPort))
                    this.sendClientMessage("Failed to start the REPL properly, please relaunch!");
            });
    
            replSocket.on('close', () => {
                replIsRunning = false;
            });
        });

        replInstance.stdout.on('data', (data) => {

        });
        
        await sleep(2500);
    }



    async startOG(port) {

        if (openGoalInstances.some(x => x.port === port)) {
            this.killOG(port);
            await sleep(1500);
        }

        this.sendClientMessage("Starting OpenGOAL!");
        this.startGK(await getOpenGoalPath(), port);

        if (runRepl) {
            if (!replIsRunning)
                await this.preStartREPL();
            
            if (replInstance && !replIsRunning) {
                console.log("Starting pre REPL (lt) connection sleep 1")
                await sleep(1500);
            }
    
            if (replInstance && !replIsRunning) {
                console.log("Starting pre REPL (lt) connection sleep 2")
                await sleep(3500);
            }
            
            if (replInstance && replIsRunning) {
                console.log("Connecting to OG and writing setup commands!")
                this.writeGoalCommand("(lt)");
                this.writeGoalCommand("(mark-repl-connected)");
            }
            else
                this.sendClientMessage("REPL startup failed");
        }

        if (!openGoalInstances.some(x => x.port === port))
            await this.stallSecondsForGkLaunch(5, port);

        console.log(".done");
        win.webContents.send("og-launched", port);
    }

    async stallSecondsForGkLaunch(seconds, port) {
        for (let i = 0; i < seconds; i++) {
            await sleep(1000);
            if (openGoalInstances.some(x => x.port === port)) {
                return;
            }
        }
    }

    startGK(ogPath, port) {
        let openGoalClient = spawn(path.join(ogPath, "gk"), ["--socketport", port, "--game", "jak1", "--", "-boot", "-fakeiso", "-debug"], { detached: true, stdio: [ 'ignore', 'pipe', 'ignore'] });
        let newInstance = {port: port, client: openGoalClient};
        openGoalInstances.push(newInstance);

        //On kill
        openGoalClient.stdout.on('end', () => {
            win.webContents.send("og-closed", port);
            openGoalInstances = openGoalInstances.filter(x => x.port !== port);
        });
        
        //We need to consume the data from stdout since it has limited buffer capacity and will pause gk if not consumed
        openGoalClient.stdout.on('data', (data) => {

        });
    }

    killAllOgInstances() {
        openGoalInstances.forEach(instance => {
            if (isWindows())
                spawn("taskkill", ["/pid", instance.client.pid, '/f', '/t']);
            else
                instance.client.kill();
        });
    }

    killOG(port) {
        this.killREPL();
        this.killGK(port);
    }

    killREPL() {
        if (!replInstance) return;
        if (isWindows())
            spawn("taskkill", ["/pid", replInstance.pid, '/f', '/t']);
        else
            replInstance.kill();

        replInstance = null;
        replIsRunning = false;
    }

    killGK(port) {
        let instance = openGoalInstances.find(x => x.port === port);
        if (instance) {
            if (isWindows())
                spawn("taskkill", ["/pid", instance.client.pid, '/f', '/t']);
            else
                instance.client.kill();
        }
    }


    writeGoalCommand(args) {
        if (!replIsRunning) return;

        let utf8Encode = new TextEncoder();
        var data = utf8Encode.encode(args);
        var bb = new ByteBuffer().LE().writeInt(data.length).writeInt(10).writeString(args).flip().toBuffer();
        console.log("writing ", args);
        this.sendClientMessage("sending: " + args);
        replSocket.write(bb);
    }


    sendClientMessage(msg) {
        win.webContents.send("backend-message", msg);
    }
}

function isWindows() {
    return process.platform === "win32";
  }

function sleep(ms) {
    return new Promise(
        resolve => setTimeout(resolve, ms)
    );
}

function getOpenGoalPath() {
    return new Promise(function(resolve) {
        fs.readFile(path.join(app.getPath('userData'), 'settings.json'), 'utf8', function(err, data) {
            if (err) 
                console.log(err); 
            else if (data)
                resolve(JSON.parse(data).ogFolderpath);
        });
    });
}

module.exports = { OpenGoal };