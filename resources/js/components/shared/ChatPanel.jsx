import React, { useState, useRef, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Paperclip, X, FileText, Image as ImageIcon, CheckCheck, Check } from "lucide-react";
import { format, isToday, isYesterday, isSameDay, parseISO } from "date-fns";
import { useChatMessages } from "./useChatMessages";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ImageLightbox from "./ImageLightbox";

export default function ChatPanel({
  open,
  onOpenChange,
  entityId,
  entityType,
  entityTitle,
  entitySubtitle,
  currentUser,
}) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const { messages, isLoading, sendMessage, markAsRead, isTyping, setIsTyping } =
    useChatMessages(entityId, entityType, currentUser?.id);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && messages.length > 0 && currentUser) {
      messages.forEach((msg) => {
        if (
          msg.sender_id !== currentUser.id &&
          (!msg.read_by || !msg.read_by.includes(currentUser.id))
        ) {
          markAsRead({
            messageId: msg.id,
            userId: currentUser.id,
            currentReadBy: msg.read_by || [],
          });
        }
      });
    }
  }, [open, messages, currentUser, markAsRead]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const uploadFiles = async (files) => {
    setUploading(true);
    try {
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const { file_url } = await base44.integrations.Core.UploadFile({
            file,
          });
          return {
            file_name: file.name,
            file_url,
            file_size: file.size,
            file_type: file.type,
          };
        })
      );
      setAttachments([...attachments, ...uploadedFiles]);
      toast.success(`${files.length} file(s) uploaded`);
    } catch (error) {
      toast.error("Failed to upload files");
      console.error(error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await uploadFiles(files);
  };

  const handleSend = () => {
    if (!message.trim() && attachments.length === 0) return;

    const messageData = {
      entity_id: entityId,
      entity_type: entityType,
      sender_id: currentUser.id,
      sender_name: currentUser.full_name || currentUser.email,
      sender_email: currentUser.email,
      message: message.trim(),
      attachments: attachments.length > 0 ? attachments : undefined,
      timestamp: new Date().toISOString(),
      read_by: [currentUser.id],
      status: "sent",
    };

    sendMessage(messageData);
    setMessage("");
    setAttachments([]);
    setIsTyping(false);
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (e.target.value.trim() && !isTyping) {
      setIsTyping(true);
    } else if (!e.target.value.trim() && isTyping) {
      setIsTyping(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const isImageFile = (file) => {
    return file.file_type?.startsWith("image/") || 
           file.file_name?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMessageDate = (timestamp) => {
    const date = parseISO(timestamp);
    if (isToday(date)) {
      return format(date, "HH:mm");
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, "HH:mm")}`;
    }
    return format(date, "MMM dd, HH:mm");
  };

  const getDateSeparator = (timestamp) => {
    const date = parseISO(timestamp);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM dd, yyyy");
  };

  const shouldShowDateSeparator = (currentMsg, prevMsg) => {
    if (!prevMsg) return true;
    const currentDate = parseISO(currentMsg.timestamp);
    const prevDate = parseISO(prevMsg.timestamp);
    return !isSameDay(currentDate, prevDate);
  };

  const getMessageStatus = (msg) => {
    if (!msg.read_by || msg.read_by.length === 0) return "sent";
    if (msg.read_by.length === 1 && msg.read_by.includes(msg.sender_id)) return "delivered";
    if (msg.read_by.length > 1) return "read";
    return "sent";
  };

  const otherUserTyping = messages.find(
    (m) => m.sender_id !== currentUser?.id && m.is_typing
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full p-0">
        <SheetHeader className="p-6 border-b">
          <SheetTitle>{entityTitle}</SheetTitle>
          {entitySubtitle && (
            <p className="text-sm text-gray-500">{entitySubtitle}</p>
          )}
        </SheetHeader>

        <ScrollArea ref={scrollRef} className="flex-1 p-6">
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No messages yet. Start a conversation!
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((msg, idx) => {
                const isCurrentUser = msg.sender_id === currentUser?.id;
                const showDateSeparator = shouldShowDateSeparator(
                  msg,
                  messages[idx - 1]
                );
                const status = getMessageStatus(msg);

                return (
                  <React.Fragment key={msg.id}>
                    {showDateSeparator && (
                      <div className="flex items-center justify-center my-4">
                        <div className="flex-1 border-t border-gray-300"></div>
                        <span className="px-4 text-xs text-gray-500 font-medium">
                          {getDateSeparator(msg.timestamp)}
                        </span>
                        <div className="flex-1 border-t border-gray-300"></div>
                      </div>
                    )}
                    <div
                      className={`flex gap-2 ${
                        isCurrentUser ? "justify-end" : "justify-start"
                      } mb-3`}
                    >
                      {!isCurrentUser && (
                        <Avatar className="w-8 h-8 mt-1">
                          <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                            {getInitials(msg.sender_name)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[75%] ${
                          isCurrentUser && "flex flex-col items-end"
                        }`}
                      >
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            isCurrentUser
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          {!isCurrentUser && (
                            <div className="text-xs font-semibold mb-1">
                              {msg.sender_name}
                            </div>
                          )}
                          {msg.message && (
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.message}
                            </p>
                          )}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {msg.attachments.map((file, fidx) =>
                                isImageFile(file) ? (
                                  <div
                                    key={fidx}
                                    className="cursor-pointer"
                                    onClick={() => setLightboxImage(file.file_url)}
                                  >
                                    <img
                                      src={file.file_url}
                                      alt={file.file_name}
                                      className="max-w-full rounded-lg hover:opacity-90 transition-opacity"
                                      style={{ maxHeight: "300px" }}
                                    />
                                    <p className="text-xs mt-1 opacity-75">
                                      {file.file_name}
                                    </p>
                                  </div>
                                ) : (
                                  <a
                                    key={fidx}
                                    href={file.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 text-xs p-2 rounded ${
                                      isCurrentUser
                                        ? "bg-blue-700 hover:bg-blue-800"
                                        : "bg-gray-200 hover:bg-gray-300"
                                    }`}
                                  >
                                    <FileText className="w-4 h-4" />
                                    <span className="flex-1 truncate">
                                      {file.file_name}
                                    </span>
                                    <span className="text-xs opacity-75">
                                      {formatFileSize(file.file_size)}
                                    </span>
                                  </a>
                                )
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1 px-1">
                          <span
                            className={`text-xs ${
                              isCurrentUser ? "text-gray-500" : "text-gray-500"
                            }`}
                          >
                            {formatMessageDate(msg.timestamp)}
                          </span>
                          {isCurrentUser && (
                            <span className="text-gray-500">
                              {status === "read" && (
                                <CheckCheck className="w-3 h-3 text-blue-500" />
                              )}
                              {status === "delivered" && (
                                <CheckCheck className="w-3 h-3" />
                              )}
                              {status === "sent" && <Check className="w-3 h-3" />}
                            </span>
                          )}
                        </div>
                      </div>
                      {isCurrentUser && (
                        <Avatar className="w-8 h-8 mt-1">
                          <AvatarFallback className="bg-blue-600 text-white text-xs">
                            {getInitials(msg.sender_name)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
              {otherUserTyping && (
                <div className="flex gap-2 mb-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                      {getInitials(otherUserTyping.sender_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></span>
                      <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.4s" }}
                      ></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div
          className={`border-t p-4 space-y-3 ${
            dragActive ? "bg-blue-50 border-blue-300" : ""
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {dragActive && (
            <div className="text-center text-blue-600 text-sm py-2">
              Drop files here to upload
            </div>
          )}
          {attachments.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {attachments.map((file, idx) =>
                isImageFile(file) ? (
                  <div
                    key={idx}
                    className="relative group bg-gray-100 rounded overflow-hidden"
                  >
                    <img
                      src={file.file_url}
                      alt={file.file_name}
                      className="w-full h-20 object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => removeAttachment(idx)}
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                      {file.file_name}
                    </div>
                  </div>
                ) : (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-gray-100 p-2 rounded text-sm"
                  >
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="flex-1 truncate text-xs">{file.file_name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAttachment(idx)}
                      className="h-6 w-6"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )
              )}
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              ref={inputRef}
              placeholder="Type a message..."
              value={message}
              onChange={handleTyping}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={uploading}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </SheetContent>

      <ImageLightbox
        imageUrl={lightboxImage}
        open={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </Sheet>
  );
}