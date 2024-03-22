resources = ['name_resource'];

function setup(state) {
	this.type = state.type;
}

function draw({ ctx }) {
	ctx.drawImage(image, 0, 0);
}
