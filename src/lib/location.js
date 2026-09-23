// src/lib/location.js

const LOCATION_CACHE_KEY =
  'psd_device_location';

const LOCATION_CACHE_TIME_KEY =
  'psd_device_location_time';

const LOCATION_CACHE_DURATION =
  24 * 60 * 60 * 1000;


const getCachedLocation = () => {
  if (
    typeof window === 'undefined'
  ) {
    return null;
  }

  try {
    const raw =
      window.localStorage.getItem(
        LOCATION_CACHE_KEY
      );

    const time =
      Number(
        window.localStorage.getItem(
          LOCATION_CACHE_TIME_KEY
        )
      );

    if (!raw || !time) {
      return null;
    }

    const age =
      Date.now() - time;

    if (
      age >
      LOCATION_CACHE_DURATION
    ) {
      return null;
    }

    return JSON.parse(raw);
  } catch {
    return null;
  }
};


const saveLocation = (
  location
) => {
  if (
    typeof window === 'undefined'
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      LOCATION_CACHE_KEY,
      JSON.stringify(location)
    );

    window.localStorage.setItem(
      LOCATION_CACHE_TIME_KEY,
      String(Date.now())
    );
  } catch {
    // Ignore
  }
};


export const getDeviceLocation = async ({
  force = false,
} = {}) => {
  if (
    typeof window === 'undefined'
  ) {
    return {
      city: null,
      country: null,
      label: 'Không xác định',
    };
  }


  if (!force) {
    const cached =
      getCachedLocation();

    if (cached) {
      return cached;
    }
  }


  /*
   * Không dùng API vị trí nếu không cần thiết.
   *
   * ipapi.co đang trả 429 trong môi trường hiện tại.
   *
   * Ta dùng endpoint nhẹ hơn của ipwho.is.
   */

  try {
    const controller =
      new AbortController();

    const timeoutId =
      window.setTimeout(
        () => {
          controller.abort();
        },
        5000
      );

    const response =
      await fetch(
        'https://ipwho.is/',
        {
          method: 'GET',
          headers: {
            Accept:
              'application/json',
          },
          signal:
            controller.signal,
        }
      );

    window.clearTimeout(
      timeoutId
    );


    if (!response.ok) {
      throw new Error(
        `Location API HTTP ${response.status}`
      );
    }


    const data =
      await response.json();


    if (
      data?.success === false
    ) {
      throw new Error(
        data?.message ||
          'Location API failed'
      );
    }


    const city =
      data?.city || null;

    const country =
      data?.country || null;


    let label =
      'Không xác định';


    if (
      city &&
      country
    ) {
      label =
        `${city}, ${country}`;
    } else if (city) {
      label = city;
    } else if (country) {
      label = country;
    }


    const result = {
      city,
      country,
      label,
    };


    saveLocation(result);

    return result;
  } catch (error) {
    console.warn(
      'Không thể xác định vị trí thiết bị:',
      error
    );


    /*
     * Cache cả kết quả thất bại.
     *
     * Như vậy app sẽ không gọi API
     * liên tục mỗi 30 giây.
     */

    const fallback = {
      city: null,
      country: null,
      label:
        'Không xác định',
    };


    saveLocation(
      fallback
    );


    return fallback;
  }
};