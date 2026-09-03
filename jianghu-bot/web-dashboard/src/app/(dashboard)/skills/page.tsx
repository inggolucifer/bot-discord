import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query/getQueryClient';
import { cookies } from 'next/headers';
import SkillsClient from './SkillsClient';
import api from '@/lib/api';

export default async function SkillsPage() {
    const queryClient = getQueryClient();
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    if (token) {
        await queryClient.prefetchQuery({
            queryKey: ['playerProfile'],
            queryFn: async () => {
                const { data } = await api.get('/player/profile', {
                    headers: {
                        Cookie: `accessToken=${token}`
                    }
                });
                return data.data; // profile endpoint usually returns { success: true, data: { ... } }
            }
        });
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <SkillsClient />
        </HydrationBoundary>
    );
}
