import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";

export default function AlertShow({ isOpen, close }: AlertProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full">
      <Alert
        variant="destructive"
        className="flex items-start gap-3 p-4 pr-6 relative shadow-lg"
      >
        <AlertCircleIcon className="h-5 w-5 mt-1 text-red-500" />
        <div>
          <AlertTitle className="text-base">Chưa có file được chọn</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            Vui lòng chọn ít nhất một ảnh trước khi tiếp tục!
          </AlertDescription>
        </div>
        <button
          onClick={close}
          className="absolute top-2 right-2 text-sm text-red-500 hover:underline"
        >
          ✕
        </button>
      </Alert>
    </div>
  );
}
