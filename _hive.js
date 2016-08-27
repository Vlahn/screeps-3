var _Hive = {

    isPulse: function() {
        if (Game.cpu.bucket > 9000) {
            return Game.time % 5 == 0;
        } else if (Game.cpu.bucket > 7000) {
            return Game.time % 10 == 0;
        } else if (Game.cpu.bucket > 5000) {
            return Game.time % 15 == 0;
        } else if (Game.cpu.bucket > 3000) {
            return Game.time % 20 == 0;
        } else if (Game.cpu.bucket > 1000) {
            return Game.time % 30 == 0;
        } else if (Game.cpu.bucket <= 1000) {
            return Game.time % 45 == 0;
        }
    },

    moveReusePath: function() {
        if (Game.cpu.bucket > 9000) {
            return 5;
        } else if (Game.cpu.bucket > 7000) {
            return 10;
        } else if (Game.cpu.bucket > 5000) {
            return 15;
        } else if (Game.cpu.bucket > 3000) {
            return 20;
        } else if (Game.cpu.bucket > 1000) {
            return 30;
        } else if (Game.cpu.bucket <= 1000) {
            return 45;
        }
    },

    clearDeadMemory: function() {
        // Clear dead creeps from Memory
        for (var n in Memory.creeps) {
            if (!Game.creeps[n]) {
                delete Memory.creeps[n];
            }
        }
    },

    initMemory: function() {        
        }
        if (Memory['_rooms'] == null) Memory['_rooms'] = {};         

        // Populate empty room memories
        for (var r in Game['rooms']) {            
            if (Memory['_rooms'][r] == null) Memory['_rooms'][r] = {};            
            if (Memory['_tasks'][r] == null) Memory['_tasks'][r] = {};            
        }

        // Set allies
        Memory['_allies'] = {   Pantek59: '',
								Atavus: '',
								BlackLotus: '',
								Moria: '',
								shedletsky: '' };

        Memory['_population_balance'] = {};  // Reset data for population balancing
        Memory['_spawn_requests'] = {};      // Reset all spawn requests
		
		if (Memory['_request'] == null) Memory['request'] = {};
		if (Memory['_options'] == null) Memory['options'] = { console: 'on' };
    },    

    initTasks: function() {
        var _Tasks = require('_tasks');
        if (_Hive.isPulse()) {
			Memory['_tasks'] = {};
            for (var r in Game['rooms']) {            
                Memory['_tasks'][r] = {};
                _Tasks.compileTasks(r);
            }
        }
    },
	
	processRequests: function() {
		/* IMPLEMENT!!!! 		
			- sweep Memory['_request] for any requests
			- switch per request type (task injection, log request, terminal send order, etc.)
			- run switch
		*/		
		
		if (Memory['_request'] != null) {
			switch (Memory['request']) {
				default:
					return;
					
				case 'log_resources':
					var __Logs = require('__logs');
					__Logs.Resources();
					return;
					
			}
		}
	},
	
	runEconomy: function() {
		/* IMPLEMENT!!!! 
			- on isPulse()
			- cycle through each Game['rooms'], note each terminal (owned by me!)
			- have settings for default energy and mineral levels for each terminal
				- 25K energy per terminal
			- see which minerals are in excess of default values			
			
			- also add courier tasks for each terminal!
			- add a _Sites.Industry for the room to process. *OR* do a _Sites.Commerce that uses a creep of type
				'courier' (overlaps tasks but not functionality with _Sites.Industry)
		*/
		
		var _Tasks = require('_tasks');
		if (Memory['_terminals'] == null) Memory['_terminals'] = {};
		
        if (_Hive.isPulse()) {
			var listRooms = Object.keys(Game['rooms']).filter(function(a)
				{ return Game['rooms'][a].terminal != null && Game['rooms'][a].terminal.my == true; });
				
			for (var r in listRooms) {
				if (Memory['_terminals'][r] == null) {
					Memory['_terminals'][r] = // Terminals have minimums storage amounts and active requests
						{ minimum: { energy: 5000 }, requests: {} };
				}
				
				var terminal = Game['rooms'][r].terminal;
				
				for (var req in Memory['_terminals'][r]['minimum']) {					
					if (Object.keys(terminal.store).includes(req) 
							&& terminal.store[req] >= Memory['_terminals'][r]['minimum'][req])
						continue;					
						
					// If there's some in storage, just bring the supply from storage!
					var storage = Game['rooms'][r].storage;					
					if (storage != null && Object.keys(storage.store).includes(req)) {
						_Tasks.addTask(rmColony, 
							{   type: 'industry', subtype: 'withdraw', 
								resource: req, id: storage.id, 
								timer: 10, creeps: 8, priority: 3 
							});
						_Tasks.addTask(rmColony, 
							{   type: 'industry', subtype: 'deposit', 
								resource: req,
								id: Game['rooms'][r].terminal.id,
								timer: 10, creeps: 8, priority: 3 
							});
							
						if (Memory['options']['console'] == 'on') {
							console.log("<font color="#45C9BE">Transferring from storage: terminal " + r
									+ "placing tasks for " + req + "</font>");
					}

					}
					
					// Place any defecit for the supply into orders					
					var amount = Object.keys(terminal.store).includes(req)
						? Memory['_terminals'][r]['minimum'][req] - terminal.store[req]
						: Memory['_terminals'][r]['minimum'][req];
					Memory['_terminals'][r]['requests'][req] = amount;
					if (Memory['options']['console'] == 'on') {
						console.log("<font color="#00BDAD">Requesting order: terminal " + r
								+ "requesting " + amount + " of " + req + "</font>");
					}
				}	
				
				// Recurse all other rooms' terminal orders, see if this terminal can fill the order
				for (var r2 in listRooms) {
					if (r2 == r) continue;
					
					for (var req in Memory['terminals'][r2]['requests']) {
						if (Object.keys(terminal.store).includes(req)) {
							// IMPLEMENT: If this terminal has excess, send excess
							if (Object.keys(Memory['terminals'][r]['minimum']).contains(req) 
									|| Object.keys(Memory['terminals'][r]['requests']).contains(req))
								continue;
								
							var amount = Math.min(terminal.store[req], Memory['terminals'][r2]['requests'][req]);
							if (Memory['options']['console'] == 'on') {
								console.log("<font color="#008B75">Sending from terminal " + r2 + " to " 
										+ r1 + " " + amount + " of " + req + "</font>");
							}
							//terminal.send(req, amount, r2);
						}
					}
				}
			}			
		}		
	}
	
    populationTally: function(rmName, popTarget, popActual) {
        // Tallies the target population for a colony, to be used for spawn load balancing
        if (Memory['_population_balance'][rmName] == null) {
            Memory['_population_balance'][rmName] = {target: popTarget, actual: popActual, total: null};
        } else {
            Memory['_population_balance'][rmName]['target'] += popTarget;
            Memory['_population_balance'][rmName]['actual'] += popActual; 
        }
    },


    requestSpawn: function(rmName, spawnDistance, lvlPriority, tgtLevel, cBody, cName, cArgs) {
        /*  lvlPriority is an integer rating priority, e.g.:
                0: Defense (active, imminent danger)
                1: Mining operations (critical)
                2: Mining operations (regular)
                3: Colony operation (critical)
                4: Colony operation (regular)
                5: ... ? scouting? passive defense?
                
            tgtLevel is the target level of the creep's body (per util.creep)
            spawnDistance is linear map distance from which a room (of equal or higher level) can spawn for this request
		*/

        var i = Object.keys(Memory['_spawn_requests']).length;
        Memory['_spawn_requests'][i] = {room: rmName, distance: spawnDistance, priority: lvlPriority, level: tgtLevel, body: cBody, name: cName, args: cArgs};
	},


    processSpawnRequests: function() {
        // Determine percentage each colony meets its target population
        for (var n in Memory['_population_balance']) {            
            Memory['_population_balance'][n]['total'] = Memory['_population_balance'][n]['actual'] / Memory['_population_balance'][n]['target'];
        }

        var listRequests = Object.keys(Memory['_spawn_requests']).sort(function(a, b) { 
            return Memory['_spawn_requests'][a]['priority'] - Memory['_spawn_requests'][b]['priority']; } );
        var listSpawns = Object.keys(Game['spawns']).filter(function(a) { return Game['spawns'][a].spawning == null; });
        var __Creep = require('__creep');

        for (var r in listRequests) {
            for (var s in listSpawns) {
                if (listSpawns[s] != null && listRequests[r] != null) {
					var spawn = Game['spawns'][listSpawns[s]];
                    var request = Memory['_spawn_requests'][listRequests[r]];
                    if (Game.map.getRoomLinearDistance(spawn.room.name, request.room) <= request.distance) {
                        var level = Math.max(1, Math.ceil(Memory['_population_balance'][request.room]['total'] 
                                * Math.min(request.level, _Hive.getRoom_Level(spawn.room.name))));
						var body = __Creep.getBody(request.body, level);
                        var result = spawn.createCreep(body, request.name, request.args);
						
                        if (_.isString(result)) {
							if (Memory['options']['console'] == 'on') {
								console.log("<font color="#19C800">Spawning a level " + level + " (of " + request.level + ") " + request.body 
										+ " at " + spawn.room.name + " for " + request.room + "</font>");
							}
                            listSpawns[s] = null;
                            listRequests[r] = null;
                        }
                    }
                }
            }
        }
	},

    processSpawnRenewing: function() {
        var __Creep = require('__creep');
        var listSpawns = Object.keys(Game['spawns']).filter(function(a) { return Game['spawns'][a].spawning == null; });
        for (var s in listSpawns) {
            var spawn = Game['spawns'][listSpawns[s]];
            var creeps = spawn.pos.findInRange(FIND_MY_CREEPS, 1);
            for (var c = 0; c < creeps.length; c++) {
                if (!__Creep.isBoosted(creeps[c])) {
                    if (spawn.renewCreep(creeps[c]) == OK) {
                        c = creeps.length;  // Break the inner for loop
                    }
                }
            }
        }
    },


    getRoom_Level: function(rmName) {
        if (Game['rooms'][rmName].energyCapacityAvailable < 550)           // lvl 1, 300 energy
            return 1;
        else if (Game['rooms'][rmName].energyCapacityAvailable < 800)      // lvl 2, 550 energy
            return 2;
        else if (Game['rooms'][rmName].energyCapacityAvailable < 1300)     // lvl 3, 800 energy
            return 3;
        else if (Game['rooms'][rmName].energyCapacityAvailable < 1800)     // lvl 4, 1300 energy
            return 4;
        else if (Game['rooms'][rmName].energyCapacityAvailable < 2300)     // lvl 5, 1800 energy
            return 5;
        else if (Game['rooms'][rmName].energyCapacityAvailable < 5300)     // lvl 6, 2300 energy
            return 6;
        else if (Game['rooms'][rmName].energyCapacityAvailable < 12300)    // lvl 7, 5300 energy
            return 7;
        else if (Game['rooms'][rmName].energyCapacityAvailable == 12300)   // lvl 8, 12300 energy
            return 8;
		},
};

module.exports = _Hive;
