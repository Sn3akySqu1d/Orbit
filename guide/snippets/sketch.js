let x, y, vx, vy;

function setup() {
    createCanvas(windowWidth, windowHeight);
    x = width / 2;
    y = height / 2;
    vx = 1;
    vy = 0;
}

function draw() {
    background(0);

    // gravity towards mouse
    let dx = mouseX - x;
    let dy = mouseY - y;
    let dist = max(sqrt(dx * dx + dy * dy), 20);
    let force = 200 / (dist * dist);
    vx += (dx / dist) * force;
    vy += (dy / dist) * force;

    // dampen so it doesn't fly off
    vx *= 0.99;
    vy *= 0.99;

    x += vx;
    y += vy;

    // draw the planet
    noStroke();
    fill(100, 160, 255);
    ellipse(x, y, 24, 24);

    // draw the "star" at the mouse
    fill(255, 200, 80);
    ellipse(mouseX, mouseY, 8, 8);
}