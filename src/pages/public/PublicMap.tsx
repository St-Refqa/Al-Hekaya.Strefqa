import React from 'react';
import PaulJourneysMap from '../../components/library/PaulJourneysMap';
import { useSearchParams } from 'react-router-dom';

export default function PublicMap() {
  const [searchParams] = useSearchParams();
  const present = searchParams.get('present') === '1';

  return (
    <div className="w-full h-screen bg-[#d0e5f2] overflow-hidden m-0 p-0 absolute inset-0 z-[9999999]">
      <PaulJourneysMap autoPresent={present} />
    </div>
  );
}
