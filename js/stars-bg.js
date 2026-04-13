window.StarsBg = (function () {
    'use strict'

    const COUNT = 180
    const COLOUR_THRESHOLD = 0.5

    const COLOURS = [
        {r: 200, g: 210, b: 255},
        {r: 255, g: 255, b: 255},
        {r: 255, g: 250, b: 230},
        {r: 255, g: 240, b: 200},
        {r: 255, g: 220, b: 160},
        {r: 255, g: 190, b: 120},
        {r: 255, g: 160, b: 100},
    ]

    const flickerSpeedBounds = [0.02, 0.05]
    const flickerDepth = 0.4
    const shootingStarChance = 0.003

    const sizeBounds = [0.8, 1.8]
    const alphaBounds = [0.1, 0.8]
    const shootingAngleBounds = [Math.PI * 0.12, Math.PI * 0.28]
    const shootingSpeedBounds = [9, 14]
    const shootingLengthBounds = [80, 160]
    const shootingLifeBounds = [60, 100]

    function factor(bounds, rng=Math.random){
        return rng() * (bounds[1] - bounds[0]) + bounds[0]
    }

    function pickColour(){
        if (Math.random() < COLOUR_THRESHOLD) return COLOURS[0]
        return COLOURS[Math.floor(Math.random() * (COLOURS.length - 1)) + 1]
    }

    function create(canvas, ctx){
        let stars = []
        let shootingStars = []
        let time = 0

        function populate(){
            stars = []
            for (let i = 0; i < COUNT; i++){
                const c = pickColour()
                stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: factor(sizeBounds),
                    r: c.r, g: c.g, b: c.b,
                    alpha: factor(alphaBounds),
                    flickerSpeed: factor(flickerSpeedBounds),
                    flickerOffset: Math.random() * Math.PI * 2
                })
            }
        }

        function resize(){
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            populate()
        }

        function spawnShootingStar(){
            const angle = factor(shootingAngleBounds)
            const speed = factor(shootingSpeedBounds)
            const fromLeft = Math.random() < 0.5
            shootingStars.push({
                x: fromLeft ? factor([-60, canvas.width * 0.3]) : factor([canvas.width * 0.7, canvas.width + 60]),
                y: factor([-40, canvas.height * 0.4]),
                vx: Math.cos(angle) * speed * (fromLeft ? 1 : -1),
                vy: Math.sin(angle) * speed,
                length: factor(shootingLengthBounds),
                life: 0,
                maxLife: factor(shootingLifeBounds)
            })
        }

        function updateShootingStars(){
            for (let i = shootingStars.length - 1; i >= 0; i--){
                const s = shootingStars[i]
                s.x += s.vx
                s.y += s.vy
                s.life++
                if (s.life > s.maxLife ||
                    s.x < -200 || s.x > canvas.width + 200 ||
                    s.y < -200 || s.y > canvas.height + 200){
                    shootingStars.splice(i, 1)
                }
            }
            if (shootingStars.length < 2 && Math.random() < shootingStarChance){
                spawnShootingStar()
            }
        }

        function render(){
            for (const s of stars){
                const flicker = Math.sin(time * s.flickerSpeed + s.flickerOffset) * flickerDepth + (1 - flickerDepth)
                ctx.beginPath()
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(${s.r}, ${s.g}, ${s.b}, ${s.alpha * flicker})`
                ctx.fill()
            }

            for (const ss of shootingStars){
                const fadeIn = Math.min(1, ss.life / 8)
                const fadeOut = Math.min(1, (ss.maxLife - ss.life) / 20)
                const a = Math.min(fadeIn, fadeOut)
                const mag = Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy)
                const tailX = ss.x - (ss.vx / mag) * ss.length
                const tailY = ss.y - (ss.vy / mag) * ss.length

                const grad = ctx.createLinearGradient(ss.x, ss.y, tailX, tailY)
                grad.addColorStop(0, `rgba(255, 255, 255, ${0.85 * a})`)
                grad.addColorStop(0.4, `rgba(200, 220, 255, ${0.35 * a})`)
                grad.addColorStop(1, 'rgba(200, 220, 255, 0)')

                ctx.beginPath()
                ctx.moveTo(ss.x, ss.y)
                ctx.lineTo(tailX, tailY)
                ctx.strokeStyle = grad
                ctx.lineWidth = 1.4
                ctx.lineCap = 'round'
                ctx.stroke()

                ctx.beginPath()
                ctx.arc(ss.x, ss.y, 1.3, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * a})`
                ctx.fill()
            }
        }

        function tick(){
            time++
            updateShootingStars()
        }

        resize()
        window.addEventListener('resize', resize)

        return { render, tick, resize }
    }

    const standalone = document.getElementById('bg-stars')
    if (standalone && !document.getElementById('galaxy')){
        const sCtx = standalone.getContext('2d')
        const sBg = create(standalone, sCtx)
        ;(function loop(){
            sCtx.fillStyle = '#000000'
            sCtx.fillRect(0, 0, standalone.width, standalone.height)
            sBg.tick()
            sBg.render()
            requestAnimationFrame(loop)
        })()
    }

    return { create }
})()
