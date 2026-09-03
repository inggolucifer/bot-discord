'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useRouter, usePathname } from 'next/navigation';

export default function ProductTour() {
    const { token, user, hasCharacter } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();
    const [hasCompletedTour, setHasCompletedTour] = useState(true); // Default true until checked

    useEffect(() => {
        if (!token || !user || !hasCharacter) return;

        const checkTourStatus = async () => {
            try {
                // Ideally this state should come directly from auth store/login payload,
                // but we fetch profile here if needed or rely on a specific endpoint
                const res = await api.get('/player/profile');
                if (res.data && res.data.data && res.data.data.hasCompletedTour === false) {
                    setHasCompletedTour(false);
                }
            } catch (error) {
                console.error("Failed to check tour status", error);
            }
        };

        checkTourStatus();
    }, [token, user, hasCharacter]);

    useEffect(() => {
        if (hasCompletedTour || pathname !== '/') return;

        // Initialize Tour
        const driverObj = driver({
            showProgress: true,
            animate: true,
            allowClose: false,
            overlayColor: 'rgba(0, 0, 0, 0.8)',
            steps: [
                {
                    element: '#nav-profile',
                    popover: {
                        title: 'Selamat Datang di Jianghu!',
                        description: 'Ini adalah halaman profil karaktermu. Di sini kamu bisa melihat status, stats tempur, dan wealth totalmu.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#nav-cultivation',
                    popover: {
                        title: 'Pusat Dantian (Kultivasi)',
                        description: 'Kumpulkan Qi dan lakukan terobosan untuk naik ke Realm yang lebih tinggi di menu ini.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#nav-ekonomi',
                    popover: {
                        title: 'Sistem Ekonomi & Pasar',
                        description: 'Akses pasar, lelang, dan kelola pekerja/NPC di sini untuk membangun sekte dan asetmu.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: 'body', // Fallback for general completion
                    popover: {
                        title: 'Siap Bertualang!',
                        description: 'Jelajahi dunia Jianghu dan jadilah Cultivator terkuat. Selamat bermain!',
                        side: 'top',
                        align: 'center'
                    }
                }
            ],
            onDestroyStarted: () => {
                if (!driverObj.hasNextStep() || confirm("Apakah kamu yakin ingin mengakhiri panduan ini?")) {
                    driverObj.destroy();
                    api.post('/player/tour-complete').then(() => {
                        setHasCompletedTour(true);
                    }).catch(console.error);
                }
            }
        });

        // Small delay to ensure DOM is ready
        setTimeout(() => {
            driverObj.drive();
        }, 1000);

    }, [hasCompletedTour, pathname]);

    return null;
}
