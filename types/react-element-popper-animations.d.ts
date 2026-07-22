declare module "react-element-popper/animations/transition" {
  type TransitionOptions = {
    from?: number;
    duration?: number;
    transition?: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export default function transition(options?: TransitionOptions): (...args: any[]) => any;
}

declare module "react-element-popper/animations/opacity" {
  type OpacityOptions = {
    from?: number;
    to?: number;
    duration?: number;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export default function opacity(options?: OpacityOptions): (...args: any[]) => any;
}
