import { useState, useEffect } from "react";
import { ThumbsUp, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
// import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clip } from "@/types/ClipTypes";
import VideoPlayer from "@/components/Clips/VideoPlayer";
import LinkedClipsCard from "@/components/Clips/LinkedClipsCard";
import { ScrollArea } from "@/components/ui/scroll-area"


const Shorts: React.FC = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const { user } = useUser();
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [ratedClips] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("trending");
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const LOCAL_STORAGE_KEY = "shorts_currentClipIndex";
  const LOCAL_STORAGE_TAB_KEY = "shorts_activeTab";

  // React Query Hook für Clips
  const { data: clips = [], isLoading } = useQuery<Clip[]>({
    queryKey: ["clips"],
    queryFn: async () => {
      console.log("fetch clips");
      const response = await fetch(`/clips_data.json`); // mockup
      // const response = await fetch(`${API_BASE_URL}/clip/all`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });

  // Like Mutation
  const likeMutation = useMutation({
    mutationFn: async (clipId: string) => {
      const response = await fetch(`${API_BASE_URL}/clip/like/${clipId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail.message);
      }
      return response.json();
    },
    onSuccess: (updatedClip) => {
      // Cache aktualisieren
      queryClient.setQueryData<Clip[]>(["clips"], (oldClips) =>
        oldClips?.map((clip) =>
          clip.id === updatedClip.id
            ? { ...clip, likes: updatedClip.likes }
            : clip
        )
      );
    },
    onError: (error: Error) => {
      toast({
        description: error.message,
      });
    },
  });

  useEffect(() => {
    const savedIndex = localStorage.getItem(LOCAL_STORAGE_KEY);
    const savedTab = localStorage.getItem(LOCAL_STORAGE_TAB_KEY);

    if (savedIndex) {
      setCurrentClipIndex(Number(savedIndex));
    }

    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, currentClipIndex.toString());
  }, [currentClipIndex]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_TAB_KEY, activeTab);
  }, [activeTab]);

  const calculatePopularityScore = (clip: Clip) => {
    const daysSinceCreation =
      (new Date().getTime() - new Date(clip.created_at).getTime()) /
      (1000 * 3600 * 24);
    const viewWeight = 0.5;
    const likeWeight = 0.4;
    const freshnessWeight = 0.1;

    return (
      (clip.view_count * viewWeight + clip.likes * likeWeight) /
      (daysSinceCreation + freshnessWeight)
    );
  };

  const getSortedClips = () => {
    if (activeTab === "best") {
      return [...clips].sort((a, b) => b.likes - a.likes);
    }
    return [...clips].sort(
      (a, b) => calculatePopularityScore(b) - calculatePopularityScore(a)
    );
  };

  const nextClip = () => {
    if (currentClipIndex < getSortedClips().length - 1) {
      setCurrentClipIndex((prevIndex) => prevIndex + 1);
    }
  };

  const prevClip = () => {
    if (currentClipIndex > 0) {
      setCurrentClipIndex((prevIndex) => prevIndex - 1);
    }
  };

  const handleThumbsUp = async (clipId: string) => {
    if (!user) {
      navigate("/login", { state: { from: window.location.pathname } });
      return;
    }
    likeMutation.mutate(clipId);
  };

  const sortedClips = getSortedClips();
  const currentClip = sortedClips[currentClipIndex];

  return (
    <div className="flex h-screen flex-col lg:flex-row">
      {/* Hauptinhalt: Tabs und Player */}
      <div className="flex-1 flex flex-col space-y-10">
        <div className="flex">
          <Tabs
            defaultValue="trending"
            onValueChange={(val) => {
              setActiveTab(val);
              setCurrentClipIndex(0);
            }}
            className="flex flex-col justify-center items-center text-white w-full max-w-5xl"
          >
            <TabsList className="w-full">
              <TabsTrigger value="trending" className="w-full">
                Trending Videos
              </TabsTrigger>
              <TabsTrigger value="best" className="w-full">
                Best Videos
              </TabsTrigger>
            </TabsList>

            {["trending", "best"].map((tab) => (
              <TabsContent
                key={tab}
                value={tab}
                className="w-full flex flex-col items-center data-[state=inactive]:!mt-0"
              >
                {currentClip ? (
                  <div className="flex justify-center items-center w-full max-w-5xl">
                    <VideoPlayer currentClip={currentClip} />
                  </div>
                ) : (
                  <p className="text-lg font-semibold">Keine Clips verfügbar.</p>
                )}
              </TabsContent>
            ))}

          </Tabs>
          {currentClip ? (

            <div className="space-y-3 flex flex-col items-center justify-center text-white mx-5">
              <div className=" items-center text-sm space-y-3">
                <div className="likes flex flex-col items-center">
                  <Button
                    variant="secondary"
                    className="w-9 h-9 rounded-full bg-white hover:bg-green-500"
                    onClick={() => handleThumbsUp(currentClip.id)}
                    disabled={ratedClips.has(currentClip.id)}
                  >
                    <ThumbsUp />
                  </Button>
                  <div className="mt-1">{currentClip.likes || 0}</div>
                </div>
                <div className="viewer flex flex-col items-center">
                  <button
                    disabled={true}
                    className="flex w-9 h-9 bg-white rounded-full items-center justify-center"
                  >
                    <Eye className=" text-black" />
                  </button>
                  <div className="mt-1">
                    {currentClip.view_count || 0}
                  </div>
                </div>
              </div>
              <div className="flex flex-col space-y-3">
                <button
                  onClick={prevClip}
                  disabled={currentClipIndex === 0}
                  className={`w-9 h-9 flex justify-center items-center rounded-full text-black font-semibold ${currentClipIndex === 0
                    ? "bg-gray-500 cursor-not-allowed"
                    : "bg-white hover:bg-blue-600"
                    }`}
                >
                  {/* <ChevronLeft /> */}
                  <ChevronUp />
                </button>
                <button
                  onClick={nextClip}
                  disabled={currentClipIndex === sortedClips.length - 1}
                  className={`w-9 h-9 flex justify-center items-center pt-1 rounded-full text-black font-semibold ${currentClipIndex === sortedClips.length - 1
                    ? "bg-gray-500 cursor-not-allowed"
                    : "bg-white hover:bg-blue-600"
                    }`}
                >
                  {/* <ChevronRight /> */}
                  <ChevronDown />
                </button>
              </div>
            </div>
          ) : null
          }
        </div>


        {isLoading && (
          <div className="mt-4 text-center text-white">
            <p className="text-lg font-semibold">Clips werden geladen...</p>
          </div>
        )}
      </div>
      <div className="space-y-3">
        <div className="text-white text-xl font-semibold">Liked Clips</div>
        <ScrollArea className="flex flex-col gap-4 overflow-y-auto h-[35.3rem]">
          {sortedClips.map((clip) => (
            <div className="first:mb-0 pb-2 last:pb-0" key={clip.id}>
              <LinkedClipsCard clip={clip} />
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Sidebar: Liked Clips */}


    </div>
  );

};

export default Shorts;
