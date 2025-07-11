type DialogProps = {
  files: { file: File; preview: string }[];
  isOpen: boolean;
  close: () => void;
  chooseWM?: File;
};

type AlertProps = {
  isOpen: boolean;
  close: () => void;
};
