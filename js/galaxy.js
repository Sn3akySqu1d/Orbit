(function () {
    'use strict';

    const PARTICLES = 200
    const CENTRE_GM = 3
    const CURSOR_REPEL_RADIUS = 30

    const dustSizeBounds = [0.6, 1.6]
    const dustAlphaBounds = [0.12, 0.25]
    const wobbleBounds = [0.95, 1.05]
    const dustTiltBounds = [0.6, 1.0]
    const clockwiseThreshold = 0.8

    const softening = 400
    const damping = 0.99
    const maxSpeed = 0.8
    const boundary = 80
    const starGM = 5
    const starSoftening = 2500
    const mouseRepel = 0.02
    const mouseRadius = 60

    const starSizeBounds = [7, 12]
    const brightnessBounds = [0.8, 1.0]
    const eccentricityBounds = [0.00, 0.01]
    const starTiltBounds = [0.82, 0.95]
    const velBounds = [0.0004, 0.001]
    const orbitMin = 0.15
    const orbitMax = 0.8
    const starClockwiseThreshold = 0.25
    const haloSize = 1.5
    const hoverIncrease = 1.2
    const hoverAlpha = 0.8

    const coreRadius = 12
    const midRadius = 35
    const outerRadius = 80
    const pulseSpeed = 0.015
    const pulseAmount = 0.08

    const canvas = document.getElementById('galaxy')
    const context = canvas.getContext('2d')
    const miniPopup = document.getElementById('tooltip')
    const bgDim = document.getElementById('popup-dim')

    const DUST_COLOURS = [
        {r: 150, g: 180, b: 220},
        {r: 170, g: 160, b: 210},
        {r: 200, g: 180, b: 160},
        {r: 130, g: 170, b: 200},
        {r: 180, g: 190, b: 220},
    ]

    const PROJ_STAR_COLOURS = [
        {hue: 220, sat: 80, light: 85},
        {hue: 215, sat: 60, light: 90},
        {hue: 210, sat: 40, light: 92},
        {hue: 200, sat: 20, light: 95},
        {hue: 40,  sat: 70, light: 80},
        {hue: 35,  sat: 80, light: 70},
        {hue: 25,  sat: 85, light: 65},
        {hue: 15,  sat: 80, light: 60},
        {hue: 10,  sat: 75, light: 55},
        {hue: 30,  sat: 75, light: 68},
    ]

    var bg = StarsBg.create(canvas, context)

    let stars = []
    let particles = []
    let hoveredStar = null
    let selectedStar = null
    let mouseX = -1000, mouseY = -1000
    let time = 0
    let canvasCentre = {x: 0, y: 0}

    function bgSetup(){
        canvas.width = window.innerWidth || document.documentElement.clientWidth
        canvas.height = window.innerHeight || document.documentElement.clientHeight
        canvasCentre = {x: canvas.width / 2, y: canvas.height / 2}
        bgElementsGenerator()
    }
    bgSetup()
    window.addEventListener('resize', bgSetup)

    function seedGenerator(seed){
        let num = 0
        for (let i = 0; i < seed.length; i++){
            num = ((num << 5) - num + seed.charCodeAt(i)) | 0
        }
        return function(){
            num = (num * 1103515245 + 12345) & 0x7fffffff
            return num / 0x7fffffff
        }
    }

    function factor(bounds, rng=Math.random){
        return rng() * (bounds[1] - bounds[0]) + bounds[0]
    }

    function bgElementsGenerator(){

        function createParticle(){
            const angle = Math.random() * Math.PI * 2
            const radiusBounds = [30, Math.min(canvasCentre.x, canvasCentre.y) * 0.85]
            const dist = factor(radiusBounds)

            const tangentialVel = Math.sqrt(CENTRE_GM / dist) * factor(wobbleBounds)
            const dir = Math.random() < clockwiseThreshold ? 1 : -1
            const tilt = factor(dustTiltBounds)
            const colour = DUST_COLOURS[Math.floor(Math.random() * DUST_COLOURS.length)]

            return {
                x: canvasCentre.x + Math.cos(angle) * dist,
                y: canvasCentre.y + Math.sin(angle) * dist * tilt,
                vx: -Math.sin(angle) * tangentialVel * dir,
                vy: Math.cos(angle) * tangentialVel * dir * tilt,
                tilt, size: factor(dustSizeBounds), alpha: factor(dustAlphaBounds),
                r: colour.r, g: colour.g, b: colour.b
            }
        }

        particles = []
        for (let i = 0; i < PARTICLES; i++){
            particles.push(createParticle())
        }
    }

    function updateParticles(){
        for (const p of particles){
            let dx = canvasCentre.x - p.x
            let dy = canvasCentre.y - p.y
            let dist = Math.sqrt(dx * dx + dy * dy)
            let force = CENTRE_GM / (dist * dist + softening)
            p.vx += (dx / dist) * force
            p.vy += (dy / dist) * force

            for (const star of stars){
                dx = star.x - p.x
                dy = star.y - p.y
                dist = Math.sqrt(dx * dx + dy * dy)
                force = starGM / (dist * dist + starSoftening)
                p.vx += (dx / dist) * force
                p.vy += (dy / dist) * force
            }

            dx = p.x - mouseX
            dy = p.y - mouseY
            dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < mouseRadius && dist > 1){
                const strength = mouseRepel * (1 - dist / mouseRadius)
                p.vx += (dx / dist) * strength
                p.vy += (dy / dist) * strength
            }

            p.vx *= damping
            p.vy *= damping

            const speed = Math.sqrt(p.vx ** 2 + p.vy ** 2)
            if (speed > maxSpeed){
                p.vx = (p.vx / speed) * maxSpeed
                p.vy = (p.vy / speed) * maxSpeed
            }

            p.x += p.vx
            p.y += p.vy

            if (p.x < -boundary || p.x > canvas.width + boundary ||
                p.y < -boundary || p.y > canvas.height + boundary){
                Object.assign(p, createParticle())
            }
        }
    }

    function createProjectStar(proj, index, total){
        const hash = seedGenerator(proj.author + proj.title)

        const radiusBounds = {
            min: Math.min(canvasCentre.x, canvasCentre.y) * orbitMin,
            max: Math.min(canvasCentre.x, canvasCentre.y) * orbitMax
        }
        const defaultRadius = radiusBounds.min + (radiusBounds.max - radiusBounds.min) * ((index + 0.5) / total)
        const radius = defaultRadius
        const eccentricity = factor(eccentricityBounds, hash)
        const phase = factor([0, 2 * Math.PI], hash)
        const tilt = factor(starTiltBounds, hash)
        const direction = hash() > starClockwiseThreshold ? 1 : -1
        const velocity = direction * factor(velBounds, hash) / (radius / radiusBounds.min)
        const size = factor(starSizeBounds, hash)
        const brightness = factor(brightnessBounds, hash)
        const colour = PROJ_STAR_COLOURS[index % PROJ_STAR_COLOURS.length]

        return {
            radius, eccentricity, phase, velocity, tilt,
            size, brightness,
            hue: colour.hue, sat: colour.sat, light: colour.light,
            x: 0, y: 0,
            data: proj
        }
    }

    function updateProjStarPos(star){
        const angle = star.phase + time * star.velocity
        const r = star.radius * (1 + star.eccentricity * Math.cos(angle * Math.E))
        star.x = canvasCentre.x + Math.cos(angle) * r
        star.y = canvasCentre.y + Math.sin(angle) * r * star.tilt
    }

    async function loadProjects(){
        let projs
        try {
            const response = await fetch('../projects.json')
            projs = await response.json()
        } catch (e) {
            console.warn('project fetch failed', e.message)
        }
        stars = projs.map((proj, i) => createProjectStar(proj, i, projs.length))
    }

    function render(){
        context.fillStyle = '#000000'
        context.fillRect(0, 0, canvas.width, canvas.height)

        // bg stars
        bg.render()

        // nebula
        const cx = canvasCentre.x
        const cy = canvasCentre.y
        const reach = Math.min(cx, cy) * 0.6
        const nebula = context.createRadialGradient(cx, cy, 0, cx, cy, reach)
        nebula.addColorStop(0, 'rgba(60, 80, 140, 0.06)')
        nebula.addColorStop(0.3, 'rgba(50, 50, 120, 0.03)')
        nebula.addColorStop(0.6, 'rgba(40, 30, 80, 0.015)')
        nebula.addColorStop(1, 'rgba(0, 0, 0, 0)')
        context.beginPath()
        context.arc(cx, cy, reach, 0, Math.PI * 2)
        context.fillStyle = nebula
        context.fill()

        // central mass
        const pulse = Math.sin(time * pulseSpeed) * pulseAmount + 1

        const outerGlow = context.createRadialGradient(cx, cy, 20, cx, cy, outerRadius * pulse)
        outerGlow.addColorStop(0, 'rgba(70, 100, 180, 0.15)')
        outerGlow.addColorStop(0.5, 'rgba(60, 80, 160, 0.05)')
        outerGlow.addColorStop(1, 'rgba(50, 60, 140, 0)')
        context.beginPath()
        context.arc(cx, cy, outerRadius * pulse, 0, Math.PI * 2)
        context.fillStyle = outerGlow
        context.fill()

        const midGlow = context.createRadialGradient(cx, cy, 5, cx, cy, midRadius * pulse)
        midGlow.addColorStop(0, 'rgba(140, 170, 240, 0.4)')
        midGlow.addColorStop(0.6, 'rgba(100, 130, 210, 0.1)')
        midGlow.addColorStop(1, 'rgba(80, 110, 200, 0)')
        context.beginPath()
        context.arc(cx, cy, midRadius * pulse, 0, Math.PI * 2)
        context.fillStyle = midGlow
        context.fill()

        const core = context.createRadialGradient(cx, cy, 0, cx, cy, coreRadius)
        core.addColorStop(0, 'rgba(220, 230, 255, 0.9)')
        core.addColorStop(0.4, 'rgba(180, 200, 250, 0.5)')
        core.addColorStop(1, 'rgba(150, 170, 230, 0)')
        context.beginPath()
        context.arc(cx, cy, coreRadius, 0, Math.PI * 2)
        context.fillStyle = core
        context.fill()

        // dust
        for (const p of particles){
            context.beginPath()
            context.arc(p.x, p.y, p.size, 0, 2 * Math.PI)
            context.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.alpha})`
            context.fill()
        }

        // project stars
        for (const s of stars){
            const isHovered = s === hoveredStar
            const drawSize = isHovered ? s.size * hoverIncrease : s.size
            const alpha = isHovered ? hoverAlpha : s.brightness

            const halo = context.createRadialGradient(s.x, s.y, drawSize * 0.5, s.x, s.y, drawSize * haloSize)
            halo.addColorStop(0, `hsla(${s.hue}, ${s.sat}%, ${s.light}%, ${alpha * 0.3})`)
            halo.addColorStop(1, `hsla(${s.hue}, ${s.sat}%, ${s.light}%, 0)`)
            context.beginPath()
            context.arc(s.x, s.y, drawSize * haloSize, 0, Math.PI * 2)
            context.fillStyle = halo
            context.fill()

            const starCore = context.createRadialGradient(s.x, s.y, 0, s.x, s.y, drawSize)
            starCore.addColorStop(0, `hsla(${s.hue}, ${s.sat}%, ${s.light}%, ${alpha})`)
            starCore.addColorStop(1, `hsla(${s.hue}, ${s.sat}%, ${s.light}%, 0)`)
            context.beginPath()
            context.arc(s.x, s.y, drawSize, 0, Math.PI * 2)
            context.fillStyle = starCore
            context.fill()
        }
    }

    function findNearestStar(x, y){
        let nearest = null
        let nearestDist = CURSOR_REPEL_RADIUS
        for (const star of stars){
            const dx = star.x - x
            const dy = star.y - y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < nearestDist){
                nearest = star
                nearestDist = dist
            }
        }
        return nearest
    }

    canvas.addEventListener('mousemove', (e) => {
        mouseX = e.clientX
        mouseY = e.clientY
        hoveredStar = findNearestStar(mouseX, mouseY)
        canvas.style.cursor = hoveredStar ? 'pointer' : 'default'
        if (hoveredStar){
            showTooltip(hoveredStar, mouseX, mouseY)
        } else {
            hideTooltip()
        }
    })

    canvas.addEventListener('mouseleave', () => {
        mouseX = -1000
        mouseY = -1000
        hoveredStar = null
        canvas.style.cursor = 'default'
        hideTooltip()
    })

    function countryFlag(code){
        const c = code.trim().toLowerCase();
        if (c.length !== 2) return null;
        return { src: `https://flagcdn.com/w80/${c}.png`, alt: c.toUpperCase() };
    }

    function openPopup(star){
        selectedStar = star
        const d = star.data

        document.getElementById('popup-title').textContent = d.title
        document.getElementById('popup-user').textContent = d.author
        document.getElementById('popup-text').textContent = d.description || ''
        document.getElementById('popup-visit').href = d.url
        document.getElementById('popup-code').href = d.repo

        const flagEl = document.getElementById('popup-flag')
        const flag = d.country ? countryFlag(d.country) : null
        if (flag) {
            flagEl.src = flag.src
            flagEl.alt = flag.alt
            flagEl.style.display = ''
        } else {
            flagEl.src = ''
            flagEl.alt = ''
            flagEl.style.display = 'none'
        }

        const ageEl = document.getElementById('popup-age')
        if (d.age != null){
            ageEl.textContent = 'Age ' + d.age
            ageEl.style.display = ''
        } else {
            ageEl.textContent = ''
            ageEl.style.display = 'none'
        }

        const img = document.getElementById('popup-image')
        const placeholder = document.getElementById('popup-image-placeholder')
        if (d.image){
            img.src = d.image.startsWith('http') ? d.image : '../images/' + d.image
            img.style.display = 'block'
            placeholder.style.display = 'none'
            img.onerror = () => {
                img.style.display = 'none'
                placeholder.style.display = 'flex'
            }
        } else {
            img.style.display = 'none'
            placeholder.style.display = 'flex'
        }

        bgDim.classList.add('active')
    }

    function showTooltip(star, x, y){
        miniPopup.textContent = star.data.title
        miniPopup.classList.add('visible')
        miniPopup.style.left = (x + 15) + 'px'
        miniPopup.style.top = (y - 10) + 'px'
    }

    function hideTooltip(){
        miniPopup.classList.remove('visible')
    }

    canvas.addEventListener('click', (e) => {
        const star = findNearestStar(e.clientX, e.clientY)
        if (star){
            openPopup(star)
            hideTooltip()
        }
    })

    canvas.addEventListener('touchstart', (e) => {
        const touch = e.touches[0]
        const star = findNearestStar(touch.clientX, touch.clientY)
        if (star){
            e.preventDefault()
            openPopup(star)
        }
    }, { passive: false })

    bgDim.addEventListener('click', (e) => {
        if (e.target === bgDim) closePopup()
    })

    document.getElementById('popup-close').addEventListener('click', closePopup)

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePopup()
    })

    function closePopup(){
        selectedStar = null
        bgDim.classList.remove('active')
    }

    function loop(){
        time++
        updateParticles()
        bg.tick()
        for (const star of stars){
            updateProjStarPos(star)
        }
        render()
        requestAnimationFrame(loop)
    }

    loadProjects().then(() => {
        loop()
    })

})()
