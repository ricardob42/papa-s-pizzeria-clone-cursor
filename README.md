# Mini Pizzería

Videojuego web inspirado en Papa’s Pizzeria: gestiona pedidos, prepara pizzas con toppings, controla el horneado y sirve a los clientes antes de que pierdan la paciencia. Incluye niveles progresivos, aumento de dificultad y sistema de puntuación.

## Jugar localmente

- Abre `index.html` en tu navegador.
- Controles:
  - Selecciona un topping y haz clic en la pizza (canvas) para colocarlo.
  - Usa los botones para añadir salsa y queso.
  - Hornear para empezar a sumar tiempo de horneado, y detener cuando creas que está al punto.
  - Servir para entregar al cliente, recibir puntuación y pasar al siguiente.
  - Tirar si te equivocas (pierdes puntos).

## Niveles y dificultad

- Cada día añade más clientes.
- La paciencia se reduce más rápido con cada día.
- Se desbloquean más toppings y se ajusta la tolerancia de horneado.

## Despliegue en GitHub Pages

Este proyecto es estático (HTML/CSS/JS sin dependencias).

1. Sube los archivos a un repositorio de GitHub.
2. Ve a Settings → Pages → Source: selecciona `main` y la carpeta `/root` (o `/docs` si mueves los archivos allí).
3. Guarda. La página quedará disponible en unos minutos bajo la URL del repositorio.

Si prefieres `/docs`:
- Crea la carpeta `docs/` y mueve `index.html`, `styles.css`, `game.js` dentro.
- Configura Pages para servir desde `docs/`.

## Accesibilidad y rendimiento

- Sin librerías externas (salvo Google Fonts opcional).
- Canvas con gráficos simples pero claros.
- Layout responsive para móviles.

¡Disfruta! 🍕
