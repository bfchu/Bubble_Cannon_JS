//-----------------------------------------------------------------------------
function State(name) {
	this.name = name;

	this.enterTransactions = [];
	this.updateTransactions = [];
	this.exitTransactions = [];
	
	this.transitions = [];
	
	// helpers to add transactions.
	
	this.onEnter = function(transaction) {
		this.enterTransactions.push(transaction);
	}
	
	this.onUpdate = function(transaction) {
		this.updateTransactions.push(transaction);
	}
	
	this.onExit = function(transaction) {
		this.exitTransactions.push(transaction);
	}
}

//-----------------------------------------------------------------------------
function Transition(name) {
	this.name = name;

	this.targetState = null;
	this.condition = null;
	
	this.isTriggered = function(owner) {
		return this.condition(owner); 
	};
}

//-----------------------------------------------------------------------------
function updateStateMachine(owner) {
	
	var transformations = [];
		
	// if owner is not in any state, enter the owner's initial state.
	if(owner.currentState == null) {
		if(owner.initialState != null) {
			owner.currentState = owner.initialState;
			console.log("Entering: " + owner.currentState.name);
			transformations = transformations.concat(owner.currentState.enterTransactions);
		}
	} else { // if owner is in a state....
		var triggeredTransition = null;
			
		// find the first triggered transition, if any. 
		for(var i = 0; i < owner.currentState.transitions.length; ++i) {
			if( owner.currentState.transitions[i].isTriggered(owner) ) {
				triggeredTransition = owner.currentState.transitions[i];
				console.log("Transition Triggered: " + triggeredTransition.name);
				break;
			}
		}
			
		// if a transition has been triggered, exit the current state, add transition tranasctions, and enter the next state.
		if(triggeredTransition != null) {
			var targetState = triggeredTransition.targetState;
				
			console.log("Exiting: " + owner.currentState.name + " Entering: " + triggeredTransition.targetState.name);
			transformations = transformations.concat(owner.currentState.exitTransactions);
							
			if(targetState != null) {
				transformations = transformations.concat(targetState.enterTransactions);
			}
				
			owner.currentState = targetState;
		} else { // if no transitions were triggered, update the current state.
			transformations = transformations.concat(owner.currentState.updateTransactions);
		}
	}

    return transformations;
}

// HELPERS

//-----------------------------------------------------------------------------
// A helper function to simplify authoring transitions.
//-----------------------------------------------------------------------------
function addTransition(name, fromState, toState, condition) {
	var transition = new Transition(name);
	transition.condition = condition;
	transition.targetState = toState;
			
	fromState.transitions.push(transition);
}

