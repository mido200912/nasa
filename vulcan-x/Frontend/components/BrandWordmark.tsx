import Image from "next/image";
import styles from "./BrandWordmark.module.css";

/** Approved typography-only artwork, cropped with a transparent background. */
export function BrandWordmark() {
  return <Image className={styles.mark} src="/brand/vulcan-x-wordmark.webp" width={1725} height={232} alt="VULCAN-X" unoptimized />;
}
