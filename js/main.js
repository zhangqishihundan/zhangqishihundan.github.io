(function () {
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');
    var effectName = document.getElementById('effect-name');
    var TWO_PI = Math.PI * 2;
    var background = 'rgb(8, 5, 16)';
    var viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: Math.min(window.devicePixelRatio || 1, 2)
    };
    var pointer = {
        x: viewport.width / 2,
        y: viewport.height / 2,
        targetX: viewport.width / 2,
        targetY: viewport.height / 2,
        vx: 0,
        vy: 0,
        speed: 0
    };
    var effectFactories = [
        createOriginalTendrilEffect,
        createWaveMeshEffect,
        createBezierRibbonEffect,
        createLissajousOrbitEffect,
        createRoseBloomEffect,
        createSpirographMorphEffect,
        createSpiralTunnelEffect
    ];
    var activeIndex = 0;
    var activeEffect = null;
    var running = true;
    var animationFrame = 0;

    var helpers = {
        clamp: function (value, min, max) {
            return Math.max(min, Math.min(max, value));
        },
        lerp: function (start, end, amount) {
            return start + (end - start) * amount;
        },
        hsla: function (h, s, l, a) {
            return 'hsla(' + h + ',' + s + '%,' + l + '%,' + a + ')';
        },
        fade: function (alpha) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(8,5,16,' + alpha + ')';
            ctx.fillRect(0, 0, viewport.width, viewport.height);
        },
        clear: function () {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = background;
            ctx.fillRect(0, 0, viewport.width, viewport.height);
        },
        strokeSmoothPath: function (points, closePath) {
            var i;
            var midpointX;
            var midpointY;
            if (!points || points.length < 2) {
                return;
            }
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (i = 1; i < points.length - 1; i++) {
                midpointX = (points[i].x + points[i + 1].x) * 0.5;
                midpointY = (points[i].y + points[i + 1].y) * 0.5;
                ctx.quadraticCurveTo(points[i].x, points[i].y, midpointX, midpointY);
            }
            ctx.quadraticCurveTo(
                points[points.length - 1].x,
                points[points.length - 1].y,
                points[points.length - 1].x,
                points[points.length - 1].y
            );
            if (closePath) {
                ctx.closePath();
            }
            ctx.stroke();
        },
        orbitPoint: function (cx, cy, radius, angle) {
            return {
                x: cx + Math.cos(angle) * radius,
                y: cy + Math.sin(angle) * radius
            };
        }
    };

    function animateLetters(id) {
        var el = document.getElementById(id);
        var letters;
        var heading = '';
        var i;
        if (!el) {
            return;
        }
        letters = el.textContent.split('');
        for (i = 0; i < letters.length; i++) {
            heading += letters[i].trim() ? '<span class="letter-' + i + '">' + letters[i] + '</span>' : '&nbsp;';
        }
        el.innerHTML = heading;
        window.setTimeout(function () {
            el.className = 'transition-in';
        }, 400 + Math.random() * 450);
    }

    function resizeCanvas() {
        viewport.width = window.innerWidth;
        viewport.height = window.innerHeight;
        viewport.dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = viewport.width * viewport.dpr;
        canvas.height = viewport.height * viewport.dpr;
        canvas.style.width = viewport.width + 'px';
        canvas.style.height = viewport.height + 'px';
        ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
        if (activeEffect && activeEffect.resize) {
            activeEffect.resize(viewport.width, viewport.height);
        }
        helpers.clear();
    }

    function updatePointerPosition(x, y) {
        pointer.targetX = helpers.clamp(x, 0, viewport.width);
        pointer.targetY = helpers.clamp(y, 0, viewport.height);
    }

    function syncPointer() {
        var dx = pointer.targetX - pointer.x;
        var dy = pointer.targetY - pointer.y;
        pointer.vx = pointer.vx * 0.72 + dx * 0.09;
        pointer.vy = pointer.vy * 0.72 + dy * 0.09;
        pointer.x += pointer.vx;
        pointer.y += pointer.vy;
        pointer.speed = Math.sqrt(pointer.vx * pointer.vx + pointer.vy * pointer.vy);
    }

    function activateEffect(index) {
        if (activeEffect && activeEffect.destroy) {
            activeEffect.destroy();
        }
        activeIndex = (index + effectFactories.length) % effectFactories.length;
        activeEffect = effectFactories[activeIndex]({
            ctx: ctx,
            pointer: pointer,
            viewport: viewport,
            helpers: helpers
        });
        effectName.textContent = activeEffect.name;
        helpers.clear();
        if (activeEffect.enter) {
            activeEffect.enter();
        }
        if (activeEffect.resize) {
            activeEffect.resize(viewport.width, viewport.height);
        }
    }

    function nextEffect() {
        activateEffect(activeIndex + 1);
    }

    function renderFrame(time) {
        if (!running) {
            return;
        }
        syncPointer();
        if (activeEffect && activeEffect.render) {
            activeEffect.render(time || 0);
        }
        animationFrame = window.requestAnimationFrame(renderFrame);
    }

    function startLoop() {
        if (running) {
            return;
        }
        running = true;
        animationFrame = window.requestAnimationFrame(renderFrame);
    }

    function stopLoop() {
        running = false;
        if (animationFrame) {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = 0;
        }
    }

    function bindEvents() {
        document.addEventListener('mousemove', function (event) {
            updatePointerPosition(event.clientX, event.clientY);
        });
        document.addEventListener('touchmove', function (event) {
            if (event.touches && event.touches[0]) {
                updatePointerPosition(event.touches[0].clientX, event.touches[0].clientY);
            }
            event.preventDefault();
        }, { passive: false });
        document.addEventListener('touchstart', function (event) {
            if (event.touches && event.touches[0]) {
                updatePointerPosition(event.touches[0].clientX, event.touches[0].clientY);
            }
        }, { passive: true });
        document.addEventListener('click', nextEffect);
        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('blur', stopLoop);
        window.addEventListener('focus', startLoop);
    }

    function createOriginalTendrilEffect(env) {
        var localCtx = env.ctx;
        var localPointer = env.pointer;
        var localViewport = env.viewport;
        var localHelpers = env.helpers;
        var settings = {
            friction: 0.5,
            trails: 20,
            size: 50,
            dampening: 0.25,
            tension: 0.98
        };
        var tendrils = [];
        var huePhase = Math.random() * TWO_PI;

        function Node(x, y) {
            this.x = x;
            this.y = y;
            this.vx = 0;
            this.vy = 0;
        }

        function Tendril(index) {
            this.spring = 0.45 + 0.025 * (index / settings.trails) + (Math.random() * 0.1 - 0.05);
            this.friction = settings.friction + (Math.random() * 0.01 - 0.005);
            this.nodes = [];
            this.reset();
        }

        Tendril.prototype.reset = function () {
            var i;
            this.nodes.length = 0;
            for (i = 0; i < settings.size; i++) {
                this.nodes.push(new Node(localPointer.x, localPointer.y));
            }
        };

        Tendril.prototype.update = function () {
            var spring = this.spring;
            var node = this.nodes[0];
            var prev;
            var i;
            node.vx += (localPointer.x - node.x) * spring;
            node.vy += (localPointer.y - node.y) * spring;
            for (i = 0; i < this.nodes.length; i++) {
                node = this.nodes[i];
                if (i > 0) {
                    prev = this.nodes[i - 1];
                    node.vx += (prev.x - node.x) * spring;
                    node.vy += (prev.y - node.y) * spring;
                    node.vx += prev.vx * settings.dampening;
                    node.vy += prev.vy * settings.dampening;
                }
                node.vx *= this.friction;
                node.vy *= this.friction;
                node.x += node.vx;
                node.y += node.vy;
                spring *= settings.tension;
            }
        };

        Tendril.prototype.draw = function () {
            var x = this.nodes[0].x;
            var y = this.nodes[0].y;
            var a;
            var b;
            var i;
            localCtx.beginPath();
            localCtx.moveTo(x, y);
            for (i = 1; i < this.nodes.length - 2; i++) {
                a = this.nodes[i];
                b = this.nodes[i + 1];
                x = (a.x + b.x) * 0.5;
                y = (a.y + b.y) * 0.5;
                localCtx.quadraticCurveTo(a.x, a.y, x, y);
            }
            a = this.nodes[i];
            b = this.nodes[i + 1];
            localCtx.quadraticCurveTo(a.x, a.y, b.x, b.y);
            localCtx.stroke();
        };

        function reset() {
            var i;
            tendrils = [];
            for (i = 0; i < settings.trails; i++) {
                tendrils.push(new Tendril(i));
            }
        }

        return {
            name: 'Original Tendrils',
            enter: reset,
            resize: reset,
            render: function () {
                var hue;
                var i;
                localHelpers.fade(0.38);
                localCtx.globalCompositeOperation = 'lighter';
                localCtx.lineWidth = 1;
                huePhase += 0.016;
                hue = 285 + Math.sin(huePhase) * 85;
                localCtx.strokeStyle = localHelpers.hsla(Math.round(hue), 90, 60, 0.24);
                for (i = 0; i < tendrils.length; i++) {
                    tendrils[i].update();
                    tendrils[i].draw();
                }
                localCtx.globalCompositeOperation = 'source-over';
            },
            destroy: function () {
                tendrils = [];
            }
        };
    }

    function createWaveMeshEffect(env) {
        var localCtx = env.ctx;
        var localPointer = env.pointer;
        var localViewport = env.viewport;
        var localHelpers = env.helpers;
        var bandCount = 15;

        return {
            name: 'Wave Mesh',
            render: function (time) {
                var t = time * 0.001;
                var w = localViewport.width;
                var h = localViewport.height;
                var i;
                var x;
                var y;
                var baseY;
                var amplitude;
                var influence;
                var points;
                localHelpers.fade(0.16);
                localCtx.globalCompositeOperation = 'lighter';
                for (i = 0; i < bandCount; i++) {
                    baseY = h * (i + 1) / (bandCount + 1);
                    amplitude = 12 + 56 * Math.exp(-Math.abs(localPointer.y - baseY) / Math.max(80, h * 0.17));
                    points = [];
                    for (x = -32; x <= w + 32; x += 18) {
                        influence = Math.exp(-Math.pow((x - localPointer.x) / Math.max(140, w * 0.22), 2));
                        y = baseY
                            + Math.sin((x / w) * TWO_PI * (1.3 + i * 0.08 + localPointer.x / w * 1.2) + t * (1.1 + i * 0.04)) * amplitude * (0.35 + influence)
                            + Math.cos(t * 1.7 + i * 0.55 + x * 0.012) * 7;
                        points.push({ x: x, y: y });
                    }
                    localCtx.strokeStyle = localHelpers.hsla((190 + i * 8 + t * 30) % 360, 95, 68, 0.12 + i * 0.005);
                    localCtx.lineWidth = 0.9 + i * 0.06;
                    localHelpers.strokeSmoothPath(points, false);
                }
                localCtx.globalCompositeOperation = 'source-over';
            }
        };
    }

    function createBezierRibbonEffect(env) {
        var localCtx = env.ctx;
        var localPointer = env.pointer;
        var localViewport = env.viewport;
        var localHelpers = env.helpers;
        var ribbonCount = 11;

        return {
            name: 'Bezier Ribbons',
            render: function (time) {
                var t = time * 0.001;
                var w = localViewport.width;
                var h = localViewport.height;
                var i;
                var startY;
                var endY;
                var controlPullX;
                var controlPullY;
                localHelpers.fade(0.2);
                localCtx.globalCompositeOperation = 'lighter';
                for (i = 0; i < ribbonCount; i++) {
                    startY = h * (i + 1) / (ribbonCount + 1);
                    endY = h - startY;
                    controlPullX = (localPointer.x / w - 0.5) * w * 0.35;
                    controlPullY = (localPointer.y / h - 0.5) * h * 0.42;
                    localCtx.beginPath();
                    localCtx.moveTo(-w * 0.08, startY);
                    localCtx.bezierCurveTo(
                        w * 0.22 + Math.sin(t * 1.2 + i * 0.35) * w * 0.14 + controlPullX * 0.4,
                        startY - controlPullY + Math.cos(t * 1.8 + i) * 40,
                        w * 0.78 + Math.cos(t * 0.9 + i * 0.42) * w * 0.14 - controlPullX * 0.4,
                        endY + controlPullY + Math.sin(t * 1.3 + i * 0.8) * 40,
                        w * 1.08,
                        endY
                    );
                    localCtx.strokeStyle = localHelpers.hsla((160 + i * 11 + t * 40) % 360, 90, 66, 0.11 + i * 0.01);
                    localCtx.lineWidth = 1.1 + i * 0.12;
                    localCtx.stroke();
                }
                localCtx.globalCompositeOperation = 'source-over';
            }
        };
    }

    function createLissajousOrbitEffect(env) {
        var localCtx = env.ctx;
        var localPointer = env.pointer;
        var localViewport = env.viewport;
        var localHelpers = env.helpers;
        var center = {
            x: localViewport.width / 2,
            y: localViewport.height / 2
        };

        return {
            name: 'Lissajous Orbit',
            resize: function (width, height) {
                center.x = width / 2;
                center.y = height / 2;
            },
            render: function (time) {
                var t = time * 0.00075;
                var w = localViewport.width;
                var h = localViewport.height;
                var baseA = 2 + (localPointer.x / w) * 4;
                var baseB = 3 + (localPointer.y / h) * 4;
                var radiusX = w * 0.14 + (localPointer.x / w) * w * 0.18;
                var radiusY = h * 0.14 + (localPointer.y / h) * h * 0.18;
                var layer;
                var points;
                var i;
                var theta;
                var mod;
                center.x = localHelpers.lerp(center.x, localPointer.x, 0.04);
                center.y = localHelpers.lerp(center.y, localPointer.y, 0.04);
                localHelpers.fade(0.12);
                localCtx.globalCompositeOperation = 'lighter';
                for (layer = 0; layer < 4; layer++) {
                    points = [];
                    for (i = 0; i <= 420; i++) {
                        theta = (i / 420) * TWO_PI * 2;
                        mod = 1 + 0.14 * Math.sin(theta * 3 + t * 5 + layer);
                        points.push({
                            x: center.x + Math.sin(theta * (baseA + layer * 0.25) + t * 8 + layer) * radiusX * mod,
                            y: center.y + Math.sin(theta * (baseB + layer * 0.25) + t * 6 + layer * 0.7) * radiusY / mod
                        });
                    }
                    localCtx.strokeStyle = localHelpers.hsla((205 + layer * 22 + t * 120) % 360, 95, 70, 0.1 + layer * 0.04);
                    localCtx.lineWidth = 1.1 + layer * 0.35;
                    localHelpers.strokeSmoothPath(points, true);
                }
                localCtx.globalCompositeOperation = 'source-over';
            }
        };
    }

    function createRoseBloomEffect(env) {
        var localCtx = env.ctx;
        var localPointer = env.pointer;
        var localViewport = env.viewport;
        var localHelpers = env.helpers;
        var center = {
            x: localViewport.width / 2,
            y: localViewport.height / 2
        };

        return {
            name: 'Rose Bloom',
            resize: function (width, height) {
                center.x = width / 2;
                center.y = height / 2;
            },
            render: function (time) {
                var t = time * 0.001;
                var w = localViewport.width;
                var h = localViewport.height;
                var baseRadius = Math.min(w, h) * (0.18 + (localPointer.y / h) * 0.12);
                var petalCount = 4 + (localPointer.x / w) * 7;
                var layer;
                var points;
                var i;
                var theta;
                var radius;
                center.x = localHelpers.lerp(center.x, localPointer.x, 0.05);
                center.y = localHelpers.lerp(center.y, localPointer.y, 0.05);
                localHelpers.fade(0.14);
                localCtx.globalCompositeOperation = 'lighter';
                for (layer = 0; layer < 5; layer++) {
                    points = [];
                    for (i = 0; i <= 720; i++) {
                        theta = (i / 720) * TWO_PI * 2;
                        radius = baseRadius * (0.72 + layer * 0.08) * Math.cos(theta * petalCount + t * (1 + layer * 0.1));
                        points.push({
                            x: center.x + Math.cos(theta + t * 0.35 + layer * 0.25) * radius,
                            y: center.y + Math.sin(theta + t * 0.35 + layer * 0.25) * radius
                        });
                    }
                    localCtx.strokeStyle = localHelpers.hsla((305 + layer * 10 + t * 50) % 360, 88, 68, 0.12 + layer * 0.03);
                    localCtx.lineWidth = 1 + layer * 0.3;
                    localHelpers.strokeSmoothPath(points, true);
                }
                localCtx.globalCompositeOperation = 'source-over';
            }
        };
    }

    function createSpirographMorphEffect(env) {
        var localCtx = env.ctx;
        var localPointer = env.pointer;
        var localViewport = env.viewport;
        var localHelpers = env.helpers;
        var center = {
            x: localViewport.width / 2,
            y: localViewport.height / 2
        };

        return {
            name: 'Spirograph Morph',
            resize: function (width, height) {
                center.x = width / 2;
                center.y = height / 2;
            },
            render: function (time) {
                var t = time * 0.001;
                var size = Math.min(localViewport.width, localViewport.height);
                var R = size * (0.21 + (localPointer.x / localViewport.width) * 0.07);
                var r = size * (0.045 + (localPointer.y / localViewport.height) * 0.04);
                var d = size * (0.08 + 0.06 * Math.sin(t * 1.1) + localHelpers.clamp(localPointer.speed * 0.01, 0, 0.06));
                var ratio = (R - r) / r;
                var layer;
                var points;
                var i;
                var theta;
                var x;
                var y;
                center.x = localHelpers.lerp(center.x, localPointer.x, 0.035);
                center.y = localHelpers.lerp(center.y, localPointer.y, 0.035);
                localHelpers.fade(0.16);
                localCtx.globalCompositeOperation = 'lighter';
                for (layer = 0; layer < 4; layer++) {
                    points = [];
                    for (i = 0; i <= 800; i++) {
                        theta = (i / 800) * TWO_PI * 8;
                        x = (R - r) * Math.cos(theta + layer * 0.12) + d * Math.cos(ratio * theta - t * 1.8 + layer * 0.35);
                        y = (R - r) * Math.sin(theta + layer * 0.12) - d * Math.sin(ratio * theta - t * 1.8 + layer * 0.35);
                        points.push({ x: center.x + x, y: center.y + y });
                    }
                    localCtx.strokeStyle = localHelpers.hsla((45 + layer * 28 + t * 80) % 360, 95, 70, 0.11 + layer * 0.04);
                    localCtx.lineWidth = 0.95 + layer * 0.4;
                    localHelpers.strokeSmoothPath(points, true);
                }
                localCtx.globalCompositeOperation = 'source-over';
            }
        };
    }

    function createSpiralTunnelEffect(env) {
        var localCtx = env.ctx;
        var localPointer = env.pointer;
        var localViewport = env.viewport;
        var localHelpers = env.helpers;
        var center = {
            x: localViewport.width / 2,
            y: localViewport.height / 2
        };
        var armCount = 5;

        return {
            name: 'Spiral Tunnel',
            resize: function (width, height) {
                center.x = width / 2;
                center.y = height / 2;
            },
            render: function (time) {
                var t = time * 0.001;
                var maxRadius = Math.min(localViewport.width, localViewport.height) * 0.48;
                var arm;
                var points;
                var i;
                var progress;
                var theta;
                var radius;
                center.x = localHelpers.lerp(center.x, localPointer.x, 0.03);
                center.y = localHelpers.lerp(center.y, localPointer.y, 0.03);
                localHelpers.fade(0.15);
                localCtx.globalCompositeOperation = 'lighter';
                for (arm = 0; arm < armCount; arm++) {
                    points = [];
                    for (i = 0; i <= 360; i++) {
                        progress = i / 360;
                        theta = progress * TWO_PI * 6 + t * 1.4 + arm * (TWO_PI / armCount);
                        radius = progress * maxRadius;
                        radius += Math.sin(progress * 20 - t * 3 + arm) * 12;
                        radius += (localPointer.x / localViewport.width - 0.5) * 80 * progress;
                        points.push({
                            x: center.x + Math.cos(theta) * radius,
                            y: center.y + Math.sin(theta) * radius + Math.sin(theta * 2 + t * 2) * (localPointer.y / localViewport.height - 0.5) * 35
                        });
                    }
                    localCtx.strokeStyle = localHelpers.hsla((250 + arm * 18 + t * 70) % 360, 90, 68, 0.12 + arm * 0.03);
                    localCtx.lineWidth = 1.1 + arm * 0.22;
                    localHelpers.strokeSmoothPath(points, false);
                }
                localCtx.globalCompositeOperation = 'source-over';
            }
        };
    }

    animateLetters('h1');
    animateLetters('h2');
    resizeCanvas();
    bindEvents();
    activateEffect(0);
    animationFrame = window.requestAnimationFrame(renderFrame);
})();
