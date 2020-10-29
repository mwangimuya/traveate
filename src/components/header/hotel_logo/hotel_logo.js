import React from 'react';

import styles from './hotel_logo.module.css';

export default function HotelLogo({ logo, title }) {
  return (
    <div className={styles.logoContainer}>
      <img
        className={styles.logo}
        src={logo}
        alt={title}
      />
    </div>
  );
}
