export default function PublicBookingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50 relative selection:bg-purple-100 selection:text-purple-900">
            {/* Soft Background Blob */}
            <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-purple-100/50 via-purple-50/20 to-transparent pointer-events-none -mr-4 -ml-4" />
            
            {/* Main Content Area */}
            <div className="relative max-w-2xl mx-auto px-4 py-8 md:py-16 min-h-screen flex flex-col">
                <div className="flex-1 w-full relative">
                    {children}
                </div>
            </div>
            
            {/* Footer */}
            <footer className="text-center py-6 text-xs font-medium text-slate-400">
                Powered by Zarif Güzellik &copy; {new Date().getFullYear()}
            </footer>
        </div>
    );
}
