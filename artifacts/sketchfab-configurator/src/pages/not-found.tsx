import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Link } from 'wouter';
import { usePageMeta } from '../components/PageShell';

export default function NotFound() {
  usePageMeta('Page Not Found | Anatomia Aperta 3D', 'Return to the open-access 3D human anatomy atlas.');
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              404 Page Not Found
            </h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            This page does not exist. <Link href="/">Return to the homepage</Link> or <Link href="/atlas">explore the anatomy atlas</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
