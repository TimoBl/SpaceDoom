function init_inputs() {
	document.addEventListener('keydown', function(event) {
		if (event.keyCode == "65" || event.keyCode == "37") {
			socket.emit('change_rotation_input', -1, shift_inp)
		} //a or arrow left
		if (event.keyCode == "68" || event.keyCode == "39") {
			socket.emit('change_rotation_input', 1, shift_inp)
		} //d or arrow right
		if (event.keyCode == "87" || event.keyCode == "38") {
			socket.emit('change_thrust_input', 1, shift_inp)
		} //w or arrow up
		if (event.keyCode == "32") {
			socket.emit('shoot')
		} //shoot
		if (event.keyCode == "16") {
			shift_inp = 0.25
		}
	}, false)

	document.addEventListener('keyup', function(event) {
		if (event.keyCode == "65" || event.keyCode == "37") {
			socket.emit('change_rotation_input', 0, 0)
		} //a or arrow left
		if (event.keyCode == "68" || event.keyCode == "39") {
			socket.emit('change_rotation_input', 0, 0)
		} //d or arrow right
		if (event.keyCode == "87" || event.keyCode == "38") {
			socket.emit('change_thrust_input', 0, 0)
		} //w or arrow up
		if (event.keyCode == "16") {
			shift_inp = 1
		}
	}, false)

	window.addEventListener("touchmove", function(event) {
		event.preventDefault()
		event.stopPropagation()
	}, {
		passive: false
	})
}