import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query/getQueryClient';
import { cookies } from 'next/headers';
import SkillTreeClient from './SkillTreeClient';
import api from '@/lib/api';

export default async function SkillTreePage() {
    const queryClient = getQueryClient();
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    if (token) {
        await queryClient.prefetchQuery({
            queryKey: ['lawSkills'],
            queryFn: async () => {
                const { data } = await api.get('/cultivation/law/skills', {
                    headers: {
                        Cookie: `accessToken=${token}`
                    }
                });
                return data;
            }
        });
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <SkillTreeClient />
        </HydrationBoundary>
    );
}
