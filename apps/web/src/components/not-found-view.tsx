import { ButtonLink } from "@ibtatech/ui";

/** Shared 404 body — used by the root boundary and the (site) boundary. */
export function NotFoundView() {
  return (
    <div className="max-w-7xl gap-4 px-4 py-32 sm:px-6 lg:px-8 mx-auto flex w-full flex-col items-center text-center">
      <p className="text-sm font-medium text-accent">404</p>
      <h1 className="font-display text-headline">Page not found</h1>
      <p className="max-w-md text-text-secondary">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <ButtonLink href="/" className="mt-2">
        Back to homepage
      </ButtonLink>
    </div>
  );
}
