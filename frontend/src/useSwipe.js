import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ROUTES = ['/dashboard', '/items', '/log', '/stats'];
const ADMIN_ROUTES = [...ROUTES, '/admin'];

export function useSwipe(isAdmin) {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const routes = isAdmin ? ADMIN_ROUTES : ROUTES;
        let startX = 0;
        let startY = 0;

        const onTouchStart = (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        };

        const onTouchEnd = (e) => {
            const dx = startX - e.changedTouches[0].clientX;
            const dy = startY - e.changedTouches[0].clientY;
            // ignore vertical swipes
            if (Math.abs(dy) > Math.abs(dx)) return;
            if (Math.abs(dx) < 60) return;

            const current = routes.indexOf(location.pathname);
            if (current === -1) return;
            if (dx > 0 && current < routes.length - 1) navigate(routes[current + 1]);
            if (dx < 0 && current > 0) navigate(routes[current - 1]);
        };

        document.addEventListener('touchstart', onTouchStart, { passive: true });
        document.addEventListener('touchend', onTouchEnd, { passive: true });
        return () => {
            document.removeEventListener('touchstart', onTouchStart);
            document.removeEventListener('touchend', onTouchEnd);
        };
    }, [navigate, location.pathname, isAdmin]);
}
