export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-lg text-muted-foreground">Page not found</p>
        <a
          href="/"
          className="inline-block mt-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Go home
        </a>
      </div>
    </div>
  );
}