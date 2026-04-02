export default function RandevuAlLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-white">
            {children}
            {/* Customer Self-booking pages will have their totally independent layout here. */}
        </div>
    );
}
