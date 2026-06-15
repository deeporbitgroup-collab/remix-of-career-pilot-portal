import { Outlet, useLocation } from 'react-router-dom';

const PathwaysLayout = () => {
  const location = useLocation();
  const isPathwaysRoute = location.pathname.startsWith('/platforms/pathways');

  if (!isPathwaysRoute) {
    return <Outlet />;
  }

  return (
    <>
      {/* Back to Website Button - Global for all Pathways pages */}
      <a
        id="back-to-website"
        href="/"
        className="fixed top-[12px] left-[12px] z-[999999] bg-[#111] text-white px-[14px] py-2 rounded-lg text-sm font-semibold no-underline hover:bg-[#222] transition-colors max-[480px]:top-[8px] max-[480px]:left-[8px] max-[480px]:px-[10px] max-[480px]:py-[6px] max-[480px]:text-xs"
      >
        ← Back to Main Site
      </a>

      {/* Content wrapper with top padding to prevent overlap */}
      <div className="pathways-layout-container pt-[60px]">
        <Outlet />
      </div>
    </>
  );
};

export default PathwaysLayout;
